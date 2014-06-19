require [
  "$api/models"
  "$views/list#List"
], (models, List) ->
  "use strict"

  doPlaylistForAlbum = ->
    album = models.Album.fromURI("spotify:album:5rCCCernTo6IwFwEZM4H53")
    list = List.forAlbum(album)
    document.getElementById("playlistContainer").appendChild list.node
    list.init()
    return

  exports.doPlaylistForAlbum = doPlaylistForAlbum
  return
