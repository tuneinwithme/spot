require([
  '$api/models',
  '$views/buttons'
], function(models, buttons) {
  'use strict';

  var init = function() {
    var roomSong = new Firebase('https://livedj01.firebaseio.com/rooms/test01/song');
    roomSong.on("value", function(data) {
      if (data)
      console.log("Data updated: ", data.val());
      models.player.playTrack(models.Track.fromURI(data.val()));
    });
  };

  exports.init = init;
});
