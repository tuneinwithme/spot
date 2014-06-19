require [
  "$api/models"
  "/strings/main.lang"
], (models, mainStrings) ->
  "use strict"
  
  #Setup a short-hand to get translation
  _ = SP.bind(mainStrings.get, mainStrings)

  doHelloWorld = ->
    document.querySelector("h1").innerHTML = _("hello")
    return

  exports.doHelloWorld = doHelloWorld
  return
