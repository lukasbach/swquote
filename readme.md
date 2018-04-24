# SWQuote

SWQuote is a small NodeJS Webapp, in which you can search for spoken phrases from star wars 3, and it will find the video snippet and show it. The algorithm uses the movies subtitles file to search. It is currently deployed on heroku, but with the source code it can deployed anywhere with any movie.

See the demo in action here: https://swquote.herokuapp.com/

Project page: http://lukasbach.com/current/swquote

## Deploying on custom server with custom movie

The server needs NodeJS, NPM and FFMPEG installed. Clone the repository on the server and move the movie file and subtitles file into the directory. Then modify the *index.js* file to customize its settings:

```js
var pathToMovie = './sw3.mp4';
var pathToSubtitles = './ep3.srt';

// Offset between movie and subtitles file. In the deployed version of the app, i have cut out the first 3 minutes in which nothing was spoken.
var offsetH = 0;
var offsetM = 3;
var offsetS = 4;

var ignoredCharacterRegex = /[\-\!\?\.\,\:\'\"\`\´ ]/g; // Characters, which will be ignored in the subtitles file.

var port = process.env.PORT || 5000;

var videoCodec = 'libx264';
var audioCodec = 'libfdk_aac';
```

Then, run *npm install* and *npm start* to start the server. It will serve video snippets which match the respective movie parts via the url *BASE_URL/v/search_query*, and it will serve the frontend directly via the base url.

## How it works

The application backend scans the subtitles file for the movie and creates an index in which it can search for quotes. The subtitle file maps small chunks of text to a start time and an end time, so when a quote search query is coming in, it looks through all those text chunks, matching the quote against the text. If it finds a matching text, it continues to match the rest of the quote against the following text chunks.

After the start and end time of the quote in the movie is determined by doing that, ffmpeg is used to cut the corresponding part of the movie out. This cut is then being piped through an express.js app to serve the movie to the frontend via the url which is displayed below the video container.

The application, both frontend and backend, are served via a heroku container. Because the container is using a free dyno with not much computing power, the app can take some time to find, cut and serve the video files, so expect waiting times of around 10 seconds per video lookup. I have also intensively reduced the video quality so that I am able to serve the movie with the free heroku dyno. The movie is scaled down to 240p with a video bitrate of 20kbit/s.

To save processing power on the server and to make things easier, the video is only rendered into mp4 format, so if your browser does not load the video file, that might be why. If the quote could not be found, it also just does not load the video.