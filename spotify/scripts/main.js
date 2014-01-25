require([
	'$api/models',
	'scripts/livedj'
], function(models, LiveDJ) {
	'use strict';

	$(document).ready(LiveDJ.init);

});



/*
require([
	'$api/models',
	'scripts/language-example',
	'scripts/cover-example',
	'scripts/button-example',
	'scripts/playlist-example',
	'scripts/livedj'
], function(models, languageExample, coverExample, buttonExample, playlistExample, livedj) {
	'use strict';

	// languageExample.doHelloWorld();
	// coverExample.doCoverForAlbum();
	// buttonExample.doShareButtonForArtist();
	// buttonExample.doPlayButtonForAlbum();
	// playlistExample.doPlaylistForAlbum();
	livedj.init();

});
*/