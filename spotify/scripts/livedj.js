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
			self.currentSongData.on("value", self.onDataChange);

			self.updateInputIfNecessary('#roominput', roomName);
			$('#roomname').text(roomName);
			console.log("room changed to " + roomName);
		};

		self.onDataChange = function(data) {
			// data = self.currentSongData;
			if (!data) return;
			self.lastInput = data.val();
			self.lastTrackURL = self.inputToTrackURL(self.lastInput);
			self.currentSongData.set(self.lastTrackURL);
			self.updateInputIfNecessary('#songinput', self.lastTrackURL);
			console.log("Track URL updated:", self.lastTrackURL);
			self.playCurrentSong();
		};

		self.playCurrentSong = function() {
			var track = models.Track.fromURI( self.lastTrackURL );
			models.player.playTrack(track);
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
		};


		return self;
	})();

	exports.init = LiveDJ.init;

});
