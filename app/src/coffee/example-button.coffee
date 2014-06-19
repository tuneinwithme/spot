require [
  '$api/models'
  '$views/buttons'
], (models, buttons) ->
  'use strict'

  doPlayButtonForAlbum = ->
    album = models.Album.fromURI('spotify:album:2mCuMNdJkoyiXFhsQCLLqw')
    button = buttons.PlayButton.forItem(album)
    document.getElementById('buttonContainer').appendChild button.node
    return


  doShareButtonForArtist = ->
    artist = models.Artist.fromURI('spotify:artist:0gxyHStUsqpMadRV0Di1Qt')
    button = buttons.ShareButton.forArtist(artist)
    document.getElementById('buttonContainer').appendChild button.node
    return

  exports.doPlayButtonForAlbum = doPlayButtonForAlbum
  exports.doShareButtonForArtist = doShareButtonForArtist
  return
