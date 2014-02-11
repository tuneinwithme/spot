listenwith.me
========

A real-time collaborative music streaming web app built off of Spotify's javascript API.
Server and routing implemented with node.js.
Database managed by Firebase.

Spotify desktop users can create private listening parties which generate a url which they can then forward to their friends who can remotely control the queue using mobile devices.

Web Interface Server
====================
See [Here](https://github.com/jennypeng/tuneinwith.me-server/) for Node.js server that handles web interface.

TODO
======== 
1. Implement upvote/downvote system for song choices
2. Local party mode/ nonlocal listening mode
3. Refactor code to fit spotify's guidelines (front-end and back-end)
4. Incorporate Twilio API for texting url and to allow users without smartphones to participate
5. "Get Started" page make over
6. Password protected rooms
7. Implement efficient memory maintanence system (Data expiration by TTD?)
8. Find a good TDD framework and testing environment
9. Write up wireframes

