# Barstool Boxscore Challenge - NodeJS Server
### Completed by: Sam Hamburger
This NodeJS server acts as the backend data requester, and serves data requested through a single api endpoint. Data is cached in a firestore database, serving as an abstraction layer between external requests and the user interface. At the current threshold, data is fetched externally no more than once every 15 seconds.
To fire up the server, run the following commands:
```
npm install
npm start
```
The server will run on http://localhost:8440

This code was developed for the [Barstool Boxscore Challenge](https://github.com/BarstoolSports/fullstack-challenge).
