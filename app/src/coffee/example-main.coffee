require [
  "$api/models"
  "assets/scripts/example-language"
  "assets/scripts/example-cover"
  "assets/scripts/example-button"
  "assets/scripts/example-playlist"
], (models, languageExample, coverExample, buttonExample, playlistExample) ->
  "use strict"

  languageExample.doHelloWorld()
  coverExample.doCoverForAlbum()
  buttonExample.doShareButtonForArtist()
  buttonExample.doPlayButtonForAlbum()
  playlistExample.doPlaylistForAlbum()
  return
