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

		self.init = function() {
			self.changeRoom('test01');
		};

		self.changeRoom = function(roomname) {
			var data = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomname+'/song');
			$('#roomname').text(roomname);
			data.on("value", self.onChangeSong);
			self.currentSongData = data;
		};

		self.onChangeSong = function(data) {
			if (!data) return;
			self.lastTrackURL = data.val();
			console.log("Track URL updated: ", self.lastTrackURL);
			var track = models.Track.fromURI( self.lastTrackURL );
			models.player.playTrack(track);
		};

		return self;
	})();

	exports.init = LiveDJ.init;

});
