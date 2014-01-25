function httpGet(theUrl){
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function search(query){
    response = httpGet('http://ws.spotify.com/search/1/track.json?q='+query);
    res = JSON.parse(response)
    if(res.tracks[0]){
        return res.tracks[0].href;
    }
}
