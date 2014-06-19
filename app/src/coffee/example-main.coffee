require [
  "$api/models"
  "scripts/example-language"
  "scripts/example-cover"
  "scripts/example-button"
  "scripts/example-playlist"
], (models, languageExample, coverExample, buttonExample, playlistExample) ->
  "use strict"

  languageExample.doHelloWorld()
  coverExample.doCoverForAlbum()
  buttonExample.doShareButtonForArtist()
  buttonExample.doPlayButtonForAlbum()
  playlistExample.doPlaylistForAlbum()
  return
