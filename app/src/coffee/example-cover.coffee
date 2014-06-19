require [
  "$api/models"
  "$views/image#Image"
], (models, Image) ->
  "use strict"

  doCoverForAlbum = ->
    album = models.Album.fromURI("spotify:album:2mCuMNdJkoyiXFhsQCLLqw")
    image = Image.forAlbum(album,
      width: 200
      height: 200
      player: true
    )
    document.getElementById("albumCoverContainer").appendChild image.node
    return

  exports.doCoverForAlbum = doCoverForAlbum
  return
