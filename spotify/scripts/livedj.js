require([
	'$api/models',
	'$views/buttons'
], function(models, buttons) {
	'use strict';
	/* Class which represents our spotify player. */
	var LiveDJ = (function(){
		var self = {};

		self.roomName = undefined;
		self.currentSongData = undefined;
		self.currentSongIndexData = undefined; // the index representation of the current song as in an array
		self.lastTrackURL = undefined; // last track played
		self.queue = undefined;
		self.trackIndex = -1; 
		//jenny code

		// self.plTest = function() {
		// 	var playlist = models.Playlist.createTemporary('mytestplaylist').done(function(playlist) {
		// 		playlist.load('tracks').done(function(loadedPlaylist) {
		// 			loadedPlaylist.tracks.add(models.Track.fromURI("spotify:track:4VqPOruhp5EdPBeR92t6lQ"));
		// 			loadedPlaylist.tracks.add(models.Track.fromURI("spotify:track:5HF5PRNJ8KGtbzNPPc93tG"));
		// 			window.tracks = loadedPlaylist.tracks;
		// 		});
		// 	});
		// };
		/* Nested class which represents the queue, or playlist of this spotify player. */
		self.Queue = function() {
			var queue = {};

			models.Playlist.createTemporary().done(function(playlist) { // create a temporary playlist
				queue.spotify = playlist; // queue.spotify now refers to the temp playlist 
			});

			// queue.spotify = new models.Queue.createTemporary(); //spotify model

			/* Helper method which adds a url to the playlist. */
			queue.addFromURL = function(trackURL) { 
				queue.spotify.load('tracks').done(function(loadedPlaylist) { // we must load 'tracks' every time
					console.log('adding', trackURL, 'to queue');
					loadedPlaylist.tracks.add(models.Track.fromURI(trackURL)); // add to the playlist, which is now loaded
				});
			};

			/* Helper method which adds from an arrray of urls. */
			queue.addFromURLs = function(trackURLs) {
				for (var i = 0; i < trackURLs.length; i++) {
					var trackURL = trackURLs[i];
					queue.addFromURL(trackURL);
				}
			};

			/* For debugging purposes, a helping method which returns an array representation of the playlist. */
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

			/* Removal helper method. */
			// queue.removeByIndex = function(i) {
			// 	queue.spotify.load('tracks').done(function(loadedPlaylist) {
			// 		console.log('adding', trackURL, 'to queue');
			// 		loadedPlaylist.tracks.add(models.Track.fromURI(trackURL)); // why the fuck do you do this
			// 	});
			// };

			/* Clear the playlist. */
			queue.clear = function(callback) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					loadedPlaylist.tracks.clear();
					if (callback) callback(); // call the callback, if given.
				});
			};
			return queue;
		};

		// our array-backed playlist model, the real spotify playlist is held up to sync with this
		self.playlist = undefined;

		self.httpGet = function(theUrl){
			var xmlHttp = null;

			xmlHttp = new XMLHttpRequest();
			xmlHttp.open( "GET", theUrl, false );
			xmlHttp.send( null );
			return xmlHttp.responseText;
		};

		self.search = function(query){
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

		/* Method to deal with room changing. */
		self.changeRoom = function(roomName) {	
			if (self.currentSongIndexData) self.currentSongIndexData.off(); // if thecurrentSongIndexData exists, we turn it off
			roomName = roomName.toLowerCase();
			self.currentSongIndexData = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/index'); // create a new songindexdata
			self.currentSongData = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/song'); // create new current song data
			self.queueData = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/queue'); // create new playlist/queue data
			self.currentSongIndexData.on("value", self.onSongIndexDataChange()); // on any data change, call helper method.
			self.queue = new self.Queue(); // make a new queue object

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
			self.currentSongData.set($('#songinput').val());
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
