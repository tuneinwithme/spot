require ["$api/models", "$views/buttons"], (models, buttons) ->
	"use strict"
	
	# Class which represents our spotify player. 
	LiveDJ = (->
		self = {}
		
		# Nested class which represents the queue, or playlist of this spotify player. 
		self.Queue = (callback) ->
			queue = {}
			models.Playlist.createTemporary().done (playlist) -> # create a temporary playlist
				queue.spotify = playlist # queue.spotify now refers to the temp playlist
				queue.spotify.load("tracks").done (loadedPlaylist) ->
					loadedPlaylist.tracks.clear().done ->
						callback()  if callback
			
			# Add a track by URL to the queue. 
			queue.addFromURL = (trackURL) ->
				queue.spotify.load("tracks").done (loadedPlaylist) -> # we must load 'tracks' every time
					console.log "adding", trackURL, "to queue"
					loadedPlaylist.tracks.add models.Track.fromURI(trackURL) # add to the playlist, which is now loaded
			
			# Add multiple tracks by URL to the queue. Used for loading the room queue from old-style array playlists. 
			
			#queue.addFromURLs = function(trackURLs) {
			#				console.warn('queue.addFromURLs should not be used');
			#				console.log('constructing initial play queue');
			#				for (var i = 0; i < trackURLs.length; i++) {
			#					var trackURL = trackURLs[i];
			#					queue.addFromURL(trackURL);
			#				}
			#				console.log('done constructing initial play queue');
			#			};
			
			# Add multiple tracks by URL to the queue. Used for loading the room queue. 
			#			var trackEntries = [
			#				{ search: 'roar', hasUri: true, uri: 'spotify:track:xxxxx', rating: 0 }, // for processed search
			#				{ search: 'roar', hasUri: false }, // for raw search
			#				...
			#			]
			#			
			queue.addFromTrackEntry = (trackEntry) ->
				console.warn "track entry", trackEntry, "has no URI"  unless trackEntry.hasUri
				queue.addFromURL trackEntry.uri
			queue.addFromTrackEntries = (trackEntries) ->
				i = 0
				while i < trackEntries.length
					queue.addFromTrackEntry trackEntries[i]
					i++
			
			# Returns an array representation of the playlist, for debugging purposes. 
			queue.toArray = (callback) ->
				queue.spotify.load("tracks").done (loadedPlaylist) ->
					loadedPlaylist.tracks.snapshot().done (snapshot) ->
						arr = []
						i = 0
						while i < snapshot.length
							arr.push snapshot.get(i).uri
							i++
						console.log arr
						callback arr  if callback
			
			# "return" the ith track in the queue. 
			queue.getTrackByIndex = (i, callback) ->
				queue.spotify.load("tracks").done (loadedPlaylist) ->
					loadedPlaylist.tracks.snapshot().done (snapshot) ->
						callback snapshot.get(i)
			
			# Removal helper method. 
			queue.removeByIndex = (i, callback) ->
				queue.spotify.load("tracks").done (loadedPlaylist) ->
					queue.getTrackByIndex i, (track) ->
						console.log "removing", track.uri, "from queue"
						loadedPlaylist.tracks.remove track
						callback()  if callback
			
			# Clear the playlist. 
			queue.clear = (callback) ->
				queue.spotify.load("tracks").done (loadedPlaylist) ->
					loadedPlaylist.tracks.clear()
					callback()  if callback # call the callback, if given.
			queue.clearAll = (callback) ->
				queue.clear ->
					self.queueData.set []
					callback()  if callback # call the callback, if given.
			queue
		self.httpGet = (theUrl) ->
			xmlHttp = null
			xmlHttp = new XMLHttpRequest()
			xmlHttp.open "GET", theUrl, false
			xmlHttp.send null
			xmlHttp.responseText
		self.search = (query) ->
			response = self.httpGet("http://ws.spotify.com/search/1/track.json?q=" + query)
			res = JSON.parse(response)
			res.tracks[0].href  if res.tracks[0]
		
		# Force a value, if non-matching into selector. 
		self.updateInputIfNecessary = (selector, value) ->
			
			# console.log(selector, 1);
			$el = $(selector)
			
			# console.log(selector, 2);
			$el.val value  unless $el.val() is value
			$el.addClass "flash"
			setTimeout (->
				$el.removeClass "flash"
			), 0
		
		#
		#		Who listens to what kind of data?
		#
		#		node            player
		#		  <---  /song  <----
		#		player will emit 'now playing' data for nodes to display
		#				/index <---- 
		#		player will periodically save its current position in the queue so that it can be recovered on restart.
		#		  <---> /queue  ---->
		#		node can add stuff to queue, player uses it as a playlist. in the future, player will be able to rearrange.
		#		
		self.roomName = null
		self.songData = null
		self.indexData = null
		self.queueData = null
		
		# self.lastTrackURL = null; // last track played, to prevent duplicates
		self.queue = null # Queue for current room, contains Spotify playlist
		self.index = -1 # -1 means "no value stored"
		self.getFirebase = (room, path) ->
			new Firebase("https://livedj01.firebaseio.com/rooms/" + room + "/" + path)
		
		# Method to deal with room changing. TODO Emit image data? 
		self.changeRoom = (roomName) ->
			self.songData.off()  if self.songData
			self.queueData.off()  if self.queueData
			
			# if (self.queue.spotify) self.queue.clear();
			self.queue = new self.Queue(->
				self.songData.on "value", self.onSongDataChange # on any data change, call helper method.
				self.queueData.on "child_added", (snapshot) ->
					newTrackEntry = snapshot.val()
					console.log "child_added", newTrackEntry
					unless newTrackEntry.hasMetadata
						self.updateTrackMetadata newTrackEntry.uri, (track) ->
							newTrackEntry.title = track.title
							newTrackEntry.image = track.image
							newTrackEntry.artist = (if track.artist then track.artist else null)
							newTrackEntry.album = (if track.album then track.artist else null)
							newTrackEntry.hasMetadata = true
							snapshot.ref().set newTrackEntry
					self.queue.addFromTrackEntry newTrackEntry
				
				# rememeber to look to see if song has already added. if so, cast an upvote
				# then set -(voting score) as priority
				self.playFromQueueIfNecessary()
			)
			roomName = roomName.toLowerCase()
			
			# In the case that the room has prior data. 
			self.songData = self.getFirebase(roomName, "song")
			self.indexData = self.getFirebase(roomName, "index")
			self.queueData = self.getFirebase(roomName, "queue")
			
			# listener to upvote/downvotes 
			# self.queueData.on('child_changed', function(snapshot) {
			# var userName = snapshot.vote(), userData = snapshot.val();
			# alert('User ' + userName + ' now has a name of ' + userData.name.first + ' ' + userData.name.last);
			# });
			self.updateInputIfNecessary "#roominput", roomName # force room to have val
			$("#roomname").text roomName # set #roomname text to variable roomName
			self.roomName = roomName
			console.log "room changed to " + roomName
		
		#
		#		// this is fired when Firebase(/song) data changes. being unused in favor of Firebase(/playlist) // what the fuck this is totally being used
		#		self.onSongIndexDataChange = function(data) {
		#			if (!data || data == -1) return;
		#			self.index = data.val();
		#			console.log("calling from onSongIndexDataChange " + self.lastInput);
		#			var trackURL = self.inputToTrackURL(self.lastInput); // dylan parse was commented out
		#			if (trackURL == self.lastTrackURL) return; // was commented out
		#			self.currentSongData.set(trackURL); // fucking ghetto as shiiiiiieit
		#			self.updateInputIfNecessary('#songinput', trackURL); // check if url is same thing
		#			console.log("Track URL updated:", trackURL);
		#			
		#			models.player.load('track').done(function(loadedPlayer){
		#				if (loadedPlayer.track) {
		#					var prevTrackURL = loadedPlayer.track.uri;
		#					if (!trackURL) return console.warn('trackURL is empty, not doing play');
		#					if (prevTrackURL == trackURL) return console.warn('prevTrackURL == trackURL, not doing play');
		#				}
		#	
		#				self.queue.addFromURL(trackURL); // add the songurl to the queue
		#				self.playFromQueueIfNecessary();
		#				// self.playSong(trackURL);
		#				self.lastTrackURL = trackURL;
		#			});
		#
		#		};
		#		
		
		# this is fired when Firebase(/song) data changes. being unused in favor of Firebase(/playlist)
		self.onSongDataChange = (snapshot) ->
			console.warn "onSongDataChange is incomplete and currently unsupported"
			return
			data = snapshot.val()
			return  if not data or not data.uri
			
			# self.lastInput = data.val();
			trackURL = data.uri
			
			# if (trackURL == self.lastTrackURL) return;
			# self.currentSongData.set(trackURL); // fucking ghetto as shiiiiiieit
			self.updateInputIfNecessary "#songinput", trackURL # check if url is same thing
			console.log "Track URL updated:", trackURL
			models.player.load("track").done (loadedPlayer) ->
				if loadedPlayer.track
					prevTrackURL = loadedPlayer.track.uri
					return console.warn("trackURL is empty, not doing play")  unless trackURL
					return console.warn("prevTrackURL == trackURL, not doing play")  if prevTrackURL is trackURL
				
				# self.queue.addFromURL(trackURL);
				# self.playFromQueueIfNecessary();
				self.playSong trackURL
				self.lastTrackURL = trackURL
		
		# If we're not currently playing from the LiveDJ queue, do so. 
		self.playFromQueueIfNecessary = ->
			console.log "playFromQueueIfNecessary"
			models.player.load(["context", "index"]).always (player) ->
				playerContext = (if player.context then player.context.uri else null)
				queueContext = (if self.queue.spotify then self.queue.spotify.uri else null)
				console.log "currently playing from", playerContext, player.index, "should be playing from", queueContext, self.index
				self.syncIndex()  if playerContext is queueContext
				if playerContext isnt queueContext or player.index isnt self.index
					console.log "asking to play from queue"
					models.player.playContext self.queue.spotify, self.index
				
				# if (self.roomName)
				# self.changeRoom(self.roomName);
				self.syncIndex()
		
		# Figures out what the correct index should be and saves it to self.index and Firebase. 
		self.syncIndex = ->
			self.indexData.once "value", (indexData) ->
				console.log "indexData.val() =", indexData.val(), ", self.index =", self.index
				savedIndex = indexData.val()
				if savedIndex >= 0
					self.index = savedIndex
				else unless self.index >= 0
					console.log "old index not found, using 0"
					self.index = 0
					self.indexData.set 0
				console.log "indexData.val() =", indexData.val(), ", self.index =", self.index
		self.playSong = (trackURL, callback) ->
			console.log "playing", trackURL
			track = models.Track.fromURI(trackURL)
			models.player.playTrack track
		
		# does a search for the most likely match 
		self.inputToTrackURL = (input) ->
			console.log "searching '" + input + "'"
			unless input
				console.warn "empty input"
				return
			m = input.match(/spotify:track:(\w+)|open.spotify.com\/track\/(\w+)/)
			return "spotify:track:" + m[1]  if m
			self.search input
		self.updateTrackMetadata = (trackURL, callback) ->
			console.log "updateTrackMetadata"
			done = [0]
			cont = ->
				done[0]--
				callback trackInfo  if done[0] <= 0
			trackInfo = uri: trackURL
			track = models.Track.fromURI(trackURL)
			track.load(["album", "artists", "image", "name"]).done (loadedTrack) ->
				trackInfo.image = loadedTrack.image
				trackInfo.title = loadedTrack.name
				if loadedTrack.album
					done[0]++
					loadedTrack.album.load("name").done (loadedAlbum) ->
						console.log "loaded album"
						trackInfo.album = loadedAlbum.name
						cont()
				else
					trackInfo.album = null
				if loadedTrack.artists and loadedTrack.artists[0]
					done[0]++
					loadedTrack.artists[0].load("name").done (loadedArtist) ->
						console.log "loaded artist"
						trackInfo.artist = loadedArtist.name
						cont()
				else
					trackInfo.artists = null
		self.submitSong = (e) ->
			search = $("#songinput").val()
			trackEntry =
				search: search
				hasUri: true
				hasMetadata: false
				uri: self.inputToTrackURL(search)
			
			# rating: 0,
			self.songData.set trackEntry
			$("#songinput").select()
			e.preventDefault()
		self.submitQueue = (e) ->
			search = $("#queueinput").val()
			trackEntry =
				search: search
				hasUri: true
				hasMetadata: false
				uri: self.inputToTrackURL(search)
			
			# rating: 0,
			self.queueData.push trackEntry
			$("#queueinput").select()
			e.preventDefault()
		self.submitRoom = (e) ->
			self.changeRoom $("#roominput").val()
			$("#roominput").select()
			e.preventDefault()
		self.init = ->
			self.changeRoom "welcometohacktech"
			$("#songinput").select()
			$("#submitRoom").click self.submitRoom
			$("#submitSong").click self.submitSong
			$("#submitQueue").click self.submitQueue
			$("#submitClear").click ->
				self.queue.clearAll()
			$("#submitPlay").click self.playFromQueueIfNecessary
			
			# setTimeout(function(){
			# Monitors for track changes and sets the current song at /song. 
			models.player.addEventListener "change", ->
				
				# console.log('player changed!');
				models.player.load(["context", "index"]).done (player) ->
					
					# console.log(self.index);
					playerContext = (if player.context then player.context.uri else null)
					queueContext = (if self.queue.spotify then self.queue.spotify.uri else null)
					if playerContext is queueContext
						self.index = player.index
						self.indexData.set self.index
						self.queue.getTrackByIndex self.index, (track) ->
							self.songData.set uri: track.uri  if track
		
		# }, 500);
		self
	)()
	exports.LiveDJ = LiveDJ
