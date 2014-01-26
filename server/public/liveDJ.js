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

    self.simplesearch = function(query){
        var response = self.httpGet('http://ws.spotify.com/search/1/track.json?q='+query);
        var res = JSON.parse(response);
        if(res.tracks){
            return res.tracks[0].href;
        }
    }
    self.search = function(query){
        var response = self.httpGet('http://ws.spotify.com/search/1/track.json?q='+query);
        var res = JSON.parse(response);
        //if (res.tracks[0]){// if the search returns a result
        //    return res.tracks[0].href;
        //}
        $('#searchDiv').html('');
        for(var i = 0; i<5&&i!=res.tracks.length; i++){
            var result = document.createElement('div');
            result.className = 'searchResult'
            result.id = res.tracks[i].href;
            result.innerHTML = res.tracks[i].name+' &mdash; '+res.tracks[i].artists[0].name;
            $('#searchDiv').append(result);
            $(result).fadeTo("fast",1);
        }
        $('.searchResult').click(function(e){
            console.log(e.target.id);
            self.currentSongData.set(e.target.id);
            $("#searchDiv").html('Song Added!');
    });
    }

    self.updatePicture = function(){
        var trackID = self.lastTrackURL;
        var response = $.getJSON('https://embed.spotify.com/oembed/?url='+trackID+'&callback=?', function(data) {
            console.log(response);
            // var res = JSON.parse(response);
            $('#albumimage').attr('src', data.thumbnail_url);
            var albumTitle = document.createElement('h2');
            albumTitle.innerHTML = data.title;
            $('#titleContainer').html(albumTitle);
            console.log(albumTitle);
        });

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
        if (!data) return;
        self.lastInput = data.val();
        console.log("data is: "+self.lastInput);
        self.lastTrackURL = self.lastInput;
        self.currentSongData.set(self.lastTrackURL ? self.lastTrackURL : null);
        self.updatePicture();
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
        $('#songinput').val('');
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
