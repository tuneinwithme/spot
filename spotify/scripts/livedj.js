require([
	'$api/models',
	'$views/buttons'
], function(models, buttons) {
	'use strict';
	/* Class which represents our spotify player. */
	var LiveDJ = (function(){
		var self = {};

		/* Nested class which represents the queue, or playlist of this spotify player. */
		self.Queue = function() {
			var queue = {};

			models.Playlist.createTemporary().done(function(playlist) { // create a temporary playlist
				queue.spotify = playlist; // queue.spotify now refers to the temp playlist 
			});

			/* Add a track by URL to the queue. */
			queue.addFromURL = function(trackURL) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) { // we must load 'tracks' every time
					console.log('adding', trackURL, 'to queue');
					loadedPlaylist.tracks.add(models.Track.fromURI(trackURL)); // add to the playlist, which is now loaded
				});
			};

			/* Add multiple tracks by URL to the queue. Used for loading the room queue from old-style array playlists. */
			queue.addFromURLs = function(trackURLs) {
				console.warn('queue.addFromURLs should not be used');
				for (var i = 0; i < trackURLs.length; i++) {
					var trackURL = trackURLs[i];
					queue.addFromURL(trackURL);
				}
			};

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

			roomName = roomName.toLowerCase();
			
			/* In the case that the room has prior data. */
			self.songData = self.getFirebase(roomName, 'song');
			self.indexData = self.getFirebase(roomName, 'index');
			self.queueData = self.getFirebase(roomName, 'queue');
			self.queue = new self.Queue();

			self.songData.on("value", self.onSongDataChange); // on any data change, call helper method.
			self.queueData.on('child_added', function(snapshot) {
				newTrackEntry = snapshot.val();
				self.queue.addFromTrackEntry(newTrackEntry);
				// rememeber to look to see if song has already added. if so, cast an upvote
				// then set -(voting score) as priority
			});

			self.updateInputIfNecessary('#roominput', roomName); // force room to have val
			$('#roomname').text(roomName);  // set #roomname text to variable roomName
			console.log("room changed to " + roomName);
		};

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
				self.playFromQueueIfNecessary(self.index);
				// self.playSong(trackURL);
				self.lastTrackURL = trackURL;
			});

		};

		// this is fired when Firebase(/song) data changes. being unused in favor of Firebase(/playlist)
		self.onSongDataChange = function(data) {
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

		};


		/*		
		this is fired when Firebase(/playlist) data changes.
		self.onPlaylistDataChange = function(data) {
			if (!data) return;
			if (self.trackIndex != -1) 
			self.lastInput = data.val();
			self.lastTrackURL = self.inputToTrackURL(self.lastInput); // dylan parse
			self.currentSongData.set(self.lastTrackURL); // fucking ghetto as shiiiiiieit
			self.updateInputIfNecessary('#songinput', self.lastTrackURL); // check if url is same thing
			console.log("Track URL updated:", self.lastTrackURL);
			//self.playCurrentSong();
			// jenny shit code
			self.addToPlaylist();
		};
		*/



		// jenny code
		// self.listener = function() {
		// 	models.player.addEventListener('change', self.callback());
		// 	index ++; 
		// }
		// self.callback = function() {

		// }

		//jenny code
		self.addToPlaylist = function() {
			var track = models.Track.fromURI( self.lastTrackURL );
			self.pl.add(track);
		};
		/* Method to remove duplicates submissions. */
		self.playFromQueueIfNecessary = function(index) {
			models.player.load('context').done(function(loadedPlayer){
				console.log(loadedPlayer.context, self.queue.spotify)
				if (loadedPlayer.context != self.queue.spotify)
					models.player.playContext(self.queue.spotify, index);
			});

		}

		self.playSong = function(trackURL, callback) {
			console.log('playing', trackURL);
			var track = models.Track.fromURI( trackURL );
			loadedPlayer.playTrack(track);
		};

		self.inputToTrackURL = function(input) {
			console.log("called from inputToTrackUrl " + input);
			// jenny code
			//if (!input) return; // input is null for some reason? 
			//end jenny code
			var m = input.match(/spotify:track:(\w+)|open.spotify.com\/track\/(\w+)/);
			if (m) return 'spotify:track:' + m[1];
			return self.search(input);
		};

		self.submitSong = function(e) {
			var search = $('#songinput').val();
			var trackEntry = {
				search: search,
				hasUri: true,
				uri: self.inputToTrackURL(search),
				// rating: 0,
			};
			self.queue.push(trackEntry);
			$('#songinput').select();
			e.preventDefault();
		};

		self.submitRoom = function(e) {
			self.changeRoom($('#roominput').val());
			$('#roominput').select();
			e.preventDefault();
		};

		self.listener = function() {
			models.player.addEventListener('change', function() { 

			 });
		}

		self.init = function() {
			self.changeRoom('welcometohacktech');
			$('#songinput').select();
			$('#submitRoom').click(self.submitRoom);
			$('#submitSong').click(self.submitSong);
			//create a playlist
			self.pl = new models.Playlist();
		};


		return self;
	})();

	exports.LiveDJ = LiveDJ;

});
