LiveDJ = (function(){
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
    }

    self.search = function(query){
        response = self.httpGet('http://ws.spotify.com/search/1/track.json?q='+query);
        res = JSON.parse(response)
        if (res.tracks[0]){
            return res.tracks[0].href;
        }
    }

    self.updateInputIfNecessary = function(selector, value) {
        $el = $(selector);
        
        if ($el.val() != value)
            $el.val(value);
        $el.addClass('flash');
        setTimeout(function() {
            $el.removeClass('flash');
        }, 0);
    }

    self.changeRoom = function(roomName) {
        roomName = roomName.toLowerCase();
        self.currentSongData = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/song');
        // $('#roomName').text(roomName);
        self.currentSongData.on("value", self.onDataChange);

        self.updateInputIfNecessary('#roominput', roomName);
        console.log("room changed to " + roomName);
    }

    self.onDataChange = function(data) {
        if (!data) console.log("no data recieved"); return;
        console.log("change");
        self.lastInput = data.val();
        self.lastTrackURL = self.inputToTrackURL(self.lastInput);
        self.currentSongData.set(self.lastTrackURL);
        self.updateInputIfNecessary('#songinput', self.lastTrackURL);
        console.log("Track URL updated: ", self.lastTrackURL);
        // var track = models.Track.fromURI( self.lastTrackURL );
        // models.player.playTrack(track);
    }

    self.inputToTrackURL = function(input) {
        if (input.search(/^spotify:track:/) == 0) return input;
        var m = input.match(/open.spotify.com\/track\/(\w+)/);
        if (m) return 'spotify:track:' + m[1];
        return self.search(input);
    }

    self.submitSong = function() {
        self.currentSongData.set($('#songinput').val());
        $('#songinput').select();
    }

    self.submitRoom = function() {
        self.changeRoom($('#roominput').val());
        $('#roominput').select();
    }

    self.init = function() {
        self.changeRoom('welcometohacktech');
        $('#songinput').select();
    }

    return self;
})();

$(document).ready(function(){
    LiveDJ.init;
    LiveDJ.changeRoom(document.URL.split('/')[4])
});
