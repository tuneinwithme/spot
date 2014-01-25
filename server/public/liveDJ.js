LiveDJ = (function(){
        var self = {};

        self.roomName = undefined;
        self.currentSongData = undefined;
        self.lastTrackURL = undefined;

        self.changeRoom = function(roomname) {
            console.log(roomname);
            var data = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomname+'/song');
            // $('#roomname').text(roomname);
            data.on("value", self.onChangeSong);
            self.currentSongData = data;
        }

        self.onChangeSong = function(data) {
            if (!data) return;
            self.lastTrackURL = data.val();
            console.log("Track URL updated: ", self.lastTrackURL);
            // var track = models.Track.fromURI( self.lastTrackURL );
            // models.player.playTrack(track);
        }

        self.update = function() {
            console.log("updating");
            self.currentSongData.set($('#input').val());
        }

        self.init = function() {
            self.changeRoom('test01');
        }

        return self;
    })();

$(document).ready(function(){
    LiveDJ.init;
    LiveDJ.changeRoom(document.URL.split('/')[4])
});
