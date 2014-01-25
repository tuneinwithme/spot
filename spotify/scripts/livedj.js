require([
	'$api/models',
	'$views/buttons'
], function(models, buttons) {
	'use strict';

	var LiveDJ = (function(){
		var self = {};

		self.roomName = undefined;
		self.currentSongData = undefined;
		self.lastTrackURL = undefined;
		self.queue = undefined;
		self.trackIndex = -1;
		//jenny code

		self.plTest = function() {
			var playlist = models.Playlist.createTemporary('mytestplaylist').done(function(playlist) {
				playlist.load('tracks').done(function(loadedPlaylist) {
					loadedPlaylist.tracks.add(models.Track.fromURI("spotify:track:4VqPOruhp5EdPBeR92t6lQ"));
					loadedPlaylist.tracks.add(models.Track.fromURI("spotify:track:5HF5PRNJ8KGtbzNPPc93tG"));
					window.tracks = loadedPlaylist.tracks;
				});
			});
		};

		self.Queue = function() {
			var queue = {};

			models.Playlist.createTemporary().done(function(playlist) {
				queue.spotify = playlist;
			});

			// queue.spotify = new models.Queue.createTemporary(); //spotify model
			queue.addFromURL = function(trackURL) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					console.log('adding', trackURL, 'to queue');
					loadedPlaylist.tracks.add(models.Track.fromURI(trackURL));
				});
			};
			queue.addFromURLs = function(trackURLs) {
				for (var i = 0; i < trackURLs.length; i++) {
					var trackURL = trackURLs[i];
					queue.addFromURL(trackURL);
				}
			};
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
			queue.removeByIndex = function(i) {
				// queue.spotify.
			};
			queue.clear = function(callback) {
				queue.spotify.load('tracks').done(function(loadedPlaylist) {
					loadedPlaylist.tracks.clear();
					if (callback) callback();
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

		self.changeRoom = function(roomName) {
			if (self.currentSongData) self.currentSongData.off();
			roomName = roomName.toLowerCase();
			self.currentSongData = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/song');
			self.currentSongData.on("value", self.onSongDataChange);
			self.queueData = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/queue');
			self.queue = new self.Queue();

			self.updateInputIfNecessary('#roominput', roomName);
			$('#roomname').text(roomName);
			console.log("room changed to " + roomName);
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
			self.queue.addFromURL(trackURL);
			self.playSong(trackURL);
			self.lastTrackURL = trackURL;
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

		self.playSong = function(trackURL, callback) {
			console.log('playing', trackURL);
			models.player.load('track').done(function(loadedPlayer){
				var prevTrackURL = loadedPlayer.track.uri;
				if (!trackURL) return console.warn('trackURL is empty, not doing play');
				if (prevTrackURL == trackURL) return console.warn('prevTrackURL == trackURL, not doing play');
				var track = models.Track.fromURI( trackURL );
				loadedPlayer.playTrack(track);
			});
		};

		self.inputToTrackURL = function(input) {
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

		self.init = function() {
			self.changeRoom('welcometohacktech');
			$('#songinput').select();
			$('#submitRoom').click(self.submitRoom);
			$('#submitSong').click(self.submitSong);
			//
			self.pl = new models.Playlist();
		};


		return self;
	})();

	exports.LiveDJ = LiveDJ;

});
