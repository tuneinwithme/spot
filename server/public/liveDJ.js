LiveDJ = (function(){
    var self = {};

    self.roomName = undefined;
    self.currentSongData = undefined;
    self.lastTrackURL = undefined;
    self.queue = undefined;
    self.query = undefined;
    self.queueArray = [];

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
        self.query = query; 
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
            self.pushQueue(e.target.id, e.target.innerHTML);
            $("#searchDiv").html('<b>Song Added!</b>');
            $("#songinput").val('');
    });
    }

    self.updatePicture = function(){
        var trackID = self.lastTrackURL;
        var response = $.getJSON('https://embed.spotify.com/oembed/?url='+trackID+'&callback=?', function(data) {
            console.log(response);
            // var res = JSON.parse(response);
            bigImage = data.thumbnail_url.replace(/\/cover\//,"/640/");
            $('#albumimage').attr('src', bigImage);
            var albumTitle = document.createElement('h2');
            albumTitle.innerHTML = data.title;
            console.log(albumTitle);
            $('#titleContainer').html(albumTitle);
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
        self.currentSongData = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/song/uri');
        self.queue = new Firebase('https://livedj01.firebaseio.com/rooms/'+roomName+'/queue');
        // $('#roomName').text(roomName);
        self.currentSongData.on("value", self.onDataChange);
        self.queue.on("child_added", self.updateQueue);
        // self.queue.on("child_removed", self.dropQueue);
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

    self.pushQueue = function(uri, titleAndArtist){
        var split = titleAndArtist.split(' — ')
        self.queue.push(
            {
            search: self.query,
            hasUri: true,
            uri:uri,
            title: split[0],
            artist: split[1],
            rating: 0
        });
    }

    // self.dropQueue = function(snapshot) {
    //     dropped = snapshot.val();
    //     if(self.queue.indexOf(dropped) != -1)
    //         self.queue.splice(self.queue.indexOf(dropped), 1);
    // }

    self.updateQueue = function(snapshot){
        self.queueArray.push(snapshot.val());
        var queueItem = document.createElement('p');
        queueItem.innerHTML = snapshot.val().title + " &mdash; " + snapshot.val().artist;
        $('#queueDiv').append(queueItem);
        temp  = document.getElementById('queueDiv');
        temp.scrollTop = temp.scrollHeight;
        console.log(self.queueArray);
    }

    self.submitRoom = function() {
        self.changeRoom($('#roominput').val());
        $('#roominput').select();
    }

    self.init = function() {
        self.changeRoom('welcometohacktech');
        $('#songinput').select();
    }

    self.changeBackground = function() {
        var hour = new Date().getHours()
        if (hour < 7 || hour > 18) {
            $('body').removeClass('day');
            $('body').addClass('night');
        }else{
            $('body').removeClass('night');
            $('body').addClass('day');
        }
    }



    return self;
})();

$(document).ready(function(){
    LiveDJ.init;
    LiveDJ.changeRoom(document.URL.split('/')[4])
});
