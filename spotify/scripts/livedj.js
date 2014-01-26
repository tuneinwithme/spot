require([
	'$api/models',
	'$views/buttons'
], function(models, buttons) {
	'use strict';
	/* Class which represents our spotify player. */
	var LiveDJ = (function(){
		var self = {};

		/* Nested class which represents the queue, or playlist of this spotify player. */
		self.Queue = function(callback) {
			var queue = {};

			models.Playlist.createTemporary().done(function(playlist) { // create a temporary playlist
				queue.spotify = playlist; // queue.spotify now refers to the temp playlist 
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					loadedPlaylist.tracks.clear().done(function() {
						if (callback) callback();
					});
				});
			});

			/* Add a track by URL to the queue. */
			queue.addFromURL = function(trackURL) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) { // we must load 'tracks' every time
					console.log('adding', trackURL, 'to queue');
					loadedPlaylist.tracks.add(models.Track.fromURI(trackURL)); // add to the playlist, which is now loaded
				});
			};

			/* Add multiple tracks by URL to the queue. Used for loading the room queue from old-style array playlists. */
			/*queue.addFromURLs = function(trackURLs) {
				console.warn('queue.addFromURLs should not be used');
				console.log('constructing initial play queue');
				for (var i = 0; i < trackURLs.length; i++) {
					var trackURL = trackURLs[i];
					queue.addFromURL(trackURL);
				}
				console.log('done constructing initial play queue');
			};*/

			/* Add multiple tracks by URL to the queue. Used for loading the room queue. 
			var trackEntries = [
				{ search: 'roar', hasUri: true, uri: 'spotify:track:xxxxx', rating: 0 }, // for processed search
				{ search: 'roar', hasUri: false }, // for raw search
				...
			]
			*/
			queue.addFromTrackEntry = function(trackEntry) {
				if (!trackEntry.hasUri) console.warn('track entry', trackEntry, 'has no URI');
				queue.addFromURL(trackEntry.uri);
			};
			queue.addFromTrackEntries = function(trackEntries) {
				for (var i = 0; i < trackEntries.length; i++)
					queue.addFromTrackEntry(trackEntries[i]);
			};

			/* Returns an array representation of the playlist, for debugging purposes. */
			queue.toArray = function(callback) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					loadedPlaylist.tracks.snapshot().done(function(snapshot){
						var arr = [];
						for (var i = 0; i < snapshot.length; i++) {
							arr.push(snapshot.get(i).uri);
						}
						console.log(arr);
						if (callback) callback(arr);
					});
				});
			};

			/* "return" the ith track in the queue. */
			queue.getTrackByIndex = function(i, callback) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					loadedPlaylist.tracks.snapshot().done(function(snapshot) {
						callback(snapshot.get(i));
					});
				});
			};

			/* Removal helper method. */
			queue.removeByIndex = function(i, callback) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					queue.getTrackByIndex(i, function(track) {
						console.log('removing', track.uri, 'from queue');
						loadedPlaylist.tracks.remove(track);
						if (callback) callback();
					});
				});
			};

			/* Clear the playlist. */
			queue.clear = function(callback) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					loadedPlaylist.tracks.clear();
					if (callback) callback(); // call the callback, if given.
				});
			};
			queue.clearAll = function(callback) {
				queue.clear(function(){
					self.queueData.set([]);
					if (callback) callback(); // call the callback, if given.
				});
			};
			return queue;
		};

		self.httpGet = function(theUrl) {
			var xmlHttp = null;

			xmlHttp = new XMLHttpRequest();
			xmlHttp.open( "GET", theUrl, false );
			xmlHttp.send( null );
			return xmlHttp.responseText;
		};

		self.search = function(query) {
			var response = self.httpGet('http://ws.spotify.com/search/1/track.json?q='+query);
			var res = JSON.parse(response);
			if (res.tracks[0]){
				return res.tracks[0].href;
			}
		};

		/* Force a value, if non-matching into selector. */
		self.updateInputIfNecessary = function(selector, value) {
			// console.log(selector, 1);
			var $el = $(selector);
			// console.log(selector, 2);
			
			if ($el.val() != value)
				$el.val(value);
			$el.addClass('flash');
			setTimeout(function() {
				$el.removeClass('flash');
			}, 0);
		};

		/*
		Who listens to what kind of data?

		node            player
		  <---  /song  <----
		player will emit 'now playing' data for nodes to display
				/index <---- 
		player will periodically save its current position in the queue so that it can be recovered on restart.
		  <---> /queue  ---->
		node can add stuff to queue, player uses it as a playlist. in the future, player will be able to rearrange.
		*/

		self.roomName = null;

		self.songData = null;
		self.indexData = null;
		self.queueData = null;

		// self.lastTrackURL = null; // last track played, to prevent duplicates
		self.queue = null; // Queue for current room, contains Spotify playlist
		self.index = -1; // -1 means "no value stored"

		self.getFirebase = function(room, path) {
			return new Firebase('https://livedj01.firebaseio.com/rooms/'+room+'/'+path);
		};

		/* Method to deal with room changing. TODO Emit image data? */
		self.changeRoom = function(roomName) {
			if (self.songData) self.songData.off();
			if (self.queueData) self.queueData.off();

			// if (self.queue.spotify) self.queue.clear();
			self.queue = new self.Queue(function(){

				self.queueData.on('value', function(snapshot) {
					self.queue.clear(function(){
					var trackEntries = snapshot.val();
					for (var i = 0; i < trackEntries.length; i++) {
						var newTrackEntry = trackEntries[i];
						self.queue.addFromTrackEntry(newTrackEntry);
					}
					// rememeber to look to see if song has already added. if so, cast an upvote
					// then set -(voting score) as priority
					});
				});


				// self.songData.on("value", self.onSongDataChange); // on any data change, call helper method.
				self.queueData.on('child_added', function(snapshot) {
					var newTrackEntry = snapshot.val();
					if (!newTrackEntry.hasMetadata)
						self.updateTrackMetadata(newTrackEntry.uri, function(track){
							newTrackEntry.title = track.title;
							newTrackEntry.image = track.image;
							newTrackEntry.artist = track.artist;
							newTrackEntry.album = track.album;
							newTrackEntry.hasMetadata = true;
							snapshot.ref().set(newTrackEntry);
						});
					self.queue.addFromTrackEntry(newTrackEntry);
					// rememeber to look to see if song has already added. if so, cast an upvote
					// then set -(voting score) as priority

				});

				self.playFromQueueIfNecessary();

			});
			
			roomName = roomName.toLowerCase();
			/* In the case that the room has prior data. */
			self.songData = self.getFirebase(roomName, 'song');
			self.indexData = self.getFirebase(roomName, 'index');
			self.queueData = self.getFirebase(roomName, 'queue');


			// listener to upvote/downvotes 
			self.queueData.on('child_changed', function(snapshot) {
			var userName = snapshot.vote(), userData = snapshot.val();
			alert('User ' + userName + ' now has a name of ' + userData.name.first + ' ' + userData.name.last);
			});


			self.updateInputIfNecessary('#roominput', roomName); // force room to have val
			$('#roomname').text(roomName);  // set #roomname text to variable roomName
			console.log("room changed to " + roomName);
		};

		/*
		// this is fired when Firebase(/song) data changes. being unused in favor of Firebase(/playlist) // what the fuck this is totally being used
		self.onSongIndexDataChange = function(data) {
			if (!data || data == -1) return;
			self.index = data.val();
			console.log("calling from onSongIndexDataChange " + self.lastInput);
			var trackURL = self.inputToTrackURL(self.lastInput); // dylan parse was commented out
			if (trackURL == self.lastTrackURL) return; // was commented out
			self.currentSongData.set(trackURL); // fucking ghetto as shiiiiiieit
			self.updateInputIfNecessary('#songinput', trackURL); // check if url is same thing
			console.log("Track URL updated:", trackURL);
			
			models.player.load('track').done(function(loadedPlayer){
				if (loadedPlayer.track) {
					var prevTrackURL = loadedPlayer.track.uri;
					if (!trackURL) return console.warn('trackURL is empty, not doing play');
					if (prevTrackURL == trackURL) return console.warn('prevTrackURL == trackURL, not doing play');
				}
	
				self.queue.addFromURL(trackURL); // add the songurl to the queue
				self.playFromQueueIfNecessary();
				// self.playSong(trackURL);
				self.lastTrackURL = trackURL;
			});

		};
		*/

		// this is fired when Firebase(/song) data changes. being unused in favor of Firebase(/playlist)
		/*self.onSongDataChange = function(data) {
			console.warn('onSongDataChange is incomplete and currently unsupported');
			if (!data) return;
			self.lastInput = data.val();
			var trackURL = self.inputToTrackURL(self.lastInput); // dylan parse
			if (trackURL == self.lastTrackURL) return;
			self.currentSongData.set(trackURL); // fucking ghetto as shiiiiiieit
			self.updateInputIfNecessary('#songinput', trackURL); // check if url is same thing
			console.log("Track URL updated:", trackURL);
			
			models.player.load('track').done(function(loadedPlayer){
				if (loadedPlayer.track) {
					var prevTrackURL = loadedPlayer.track.uri;
					if (!trackURL) return console.warn('trackURL is empty, not doing play');
					if (prevTrackURL == trackURL) return console.warn('prevTrackURL == trackURL, not doing play');
				}
	
				self.queue.addFromURL(trackURL);
				self.playFromQueueIfNecessary();
				// self.playSong(trackURL);
				self.lastTrackURL = trackURL;
			});

		};*/

		/* If we're not currently playing from the LiveDJ queue, do so. */
		self.playFromQueueIfNecessary = function() {
			// console.log('playFromQueueIfNecessary');
			models.player.load(['context','index']).always(function(player){
				console.log('currently playing from', player.context, player.index,
							'should be playing from', self.queue.spotify, self.index);
				if (player.context == self.queue.spotify) self.syncIndex();
				if (player.context != self.queue.spotify || player.index != self.index)
					models.player.playContext(self.queue.spotify, self.index);
				self.syncIndex();
			});
		};

		/* Figures out what the correct index should be and saves it to self.index and Firebase. */
		self.syncIndex = function() {
			self.indexData.once('value', function(indexData){
				console.log('indexData.val() =', savedIndex, ', self.index =', self.index);
				var savedIndex = indexData.val();
				if (savedIndex >= 0) self.index = savedIndex;
				else if (self.index >= 0) self.indexData.set(self.index);
				else {
					self.index = 0;
					self.indexData.set(0);
				}
				console.log('indexData.val() =', indexData.val(), ', self.index =', self.index);
			});
		};

		self.playSong = function(trackURL, callback) {
			console.log('playing', trackURL);
			var track = models.Track.fromURI( trackURL );
			models.player.playTrack(track);
		};

		/* does a search for the most likely match */
		self.inputToTrackURL = function(input) {
			console.log("searching '" + input + "'");
			if (!input) {
				console.warn('empty input');
				return;
			}
			var m = input.match(/spotify:track:(\w+)|open.spotify.com\/track\/(\w+)/);
			if (m) return 'spotify:track:' + m[1];
			return self.search(input);
		};

		self.updateTrackMetadata = function(trackURL, callback){
			var done = [0];
			var cont = function() {
				done[0]++;
				if (done[0] > 1) callback(trackInfo);
			};
			var trackInfo = {uri: trackURL};
			var track = models.Track.fromURI(trackURL);
			track.load(['album', 'artists', 'image', 'name']).done(function(loadedTrack) {
				trackInfo.image = loadedTrack.image;
				trackInfo.title = loadedTrack.name;
				if (loadedTrack.album)
				loadedTrack.album.load('name').done(function(loadedAlbum){
					trackInfo.album = loadedAlbum.name;
					cont();
				});
				if (loadedTrack.artist)
				loadedTrack.artist.load('name').done(function(loadedArtist){
					trackInfo.artist = loadedAlbum.name;
					cont();
				});
			});
		};

		self.submitSong = function(e) {
			var search = $('#songinput').val();
			var trackEntry = {
				search: search,
				hasUri: true,
				hasMetadata: false,
				uri: self.inputToTrackURL(search),
				// rating: 0,
			};
			self.queueData.push(trackEntry);
			$('#songinput').select();
			e.preventDefault();
		};

		self.submitRoom = function(e) {
			self.changeRoom($('#roominput').val());
			$('#roominput').select();
			e.preventDefault();
		};

		self.init = function() {
			self.changeRoom('welcometohacktech');

			$('#songinput').select();
			$('#submitRoom').click(self.submitRoom);
			$('#submitSong').click(self.submitSong);
			$('#submitClear').click(self.queue.clearAll);
			$('#submitPlay').click(self.playFromQueueIfNecessary);

			// setTimeout(function(){
			/* Monitors for track changes and sets the current song at /song. */
			models.player.addEventListener('change', function() {
				// console.log('player changed!');
				models.player.load('index').done(function(loadedPlayer) {
					// console.log(self.index);
					self.index = loadedPlayer.index;
					// console.log(self.index);
					self.indexData.set(self.index);
					self.queue.getTrackByIndex(self.index, function(track) {
						self.songData.set({
							uri: track.uri
						});
					});
				});
			});
			// }, 500);

		};


		return self;
	})();

	exports.LiveDJ = LiveDJ;

});
