require [
  "$api/models"
  "scripts/language-example"
  "scripts/cover-example"
  "scripts/button-example"
  "scripts/playlist-example"
], (models, languageExample, coverExample, buttonExample, playlistExample) ->
  "use strict"

  languageExample.doHelloWorld()
  coverExample.doCoverForAlbum()
  buttonExample.doShareButtonForArtist()
  buttonExample.doPlayButtonForAlbum()
  playlistExample.doPlaylistForAlbum()
  return
