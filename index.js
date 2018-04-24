var pathToMovie = './sw3.mp4';
var pathToSubtitles = './ep3.srt';

var offsetH = 0;
var offsetM = 3;
var offsetS = 4;

var ignoredCharacterRegex = /[\-\!\?\.\,\:\'\"\`\´ ]/g;

var port = process.env.PORT || 5000;

var videoCodec = 'libx264';
var audioCodec = 'libfdk_aac';


var express = require('express');
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');
var app = express();

function getDuration(from, until) {
    if (!from || !until) return 0;

    from = from.replace('.', ':').split(':');
    until = until.replace('.', ':').split(':');
    diff = 0;

    diff += (until[0] - from[0]) * 60 * 60;

    if (until[1] >= from[1]) {
        diff += (until[1] - from[1]) * 60;
    } else {
        diff += (until[1]*1 + 60 - from[1]) * 60;
        diff -= 60*60;
    }

    if (until[2] >= from[2]) {
        diff += (until[2] - from[2]);
    } else {
        diff += (until[2]*1 + 60 - from[2]);
        diff -= 60;
    }

    return diff;
}

function convertTime(time) {
    // subtract offset time
    time = time.replace('.', ':').split(':');

    time[0] = time[0] - offsetH;
    time[1] = time[1] - offsetM;
    time[2] = time[2] - offsetS;

    if (time[1] < 0) {
        time[1] += 60;
        time[0] -= 1;
    }

    if (time[2] < 0) {
        time[2] += 60;
        time[1] -= 1;
    }

    return time[0] + ':' + time[1] + ':' + time[2] + '.' + time[3];
}

function loadSubtitles(callback) {
    fs.readFile(pathToSubtitles, 'utf8', function(err, text) {
        var lines = text.replace(/\\r/g, '').split('\n');
        var textObj = [];
        var bufObj = {};


        var timeRegex = /(\d\d\:\d\d:\d\d\,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)/;

        for(var lineNo = 0; lineNo < lines.length; lineNo++) {
            var line = lines[lineNo];

            if (line.match(timeRegex)) {
                var fromTime = line.match(timeRegex)[1];
                var untilTime = line.match(timeRegex)[2];
                bufObj = {
                    from: fromTime,
                    until: untilTime,
                    text: ''
                }
            } else if (!isNaN(line)) {
                if (JSON.stringify(bufObj) !== JSON.stringify({})) textObj.push(bufObj);
                bufObj = {};
            } else if (line !== '') {
                bufObj.text += line.replace(ignoredCharacterRegex, '').toLowerCase();
            }
        }

        callback(textObj);
    });
}

function matchTextOnMovie(text, callback) {
    text = text.replace(ignoredCharacterRegex, '').toLowerCase();
    console.log("Searching: ", text);

    loadSubtitles(function(subObj) {
        var curSubtitles = {};
        var textBuf = text;

        var from = -1;


        for (var subTitleNo = 0; subTitleNo < subObj.length; subTitleNo++) {
            curSubtitles = subObj[subTitleNo];

            for (var textNo = 0; textNo < curSubtitles.text.length; textNo++) {
                if (textBuf.charAt(0) === curSubtitles.text.charAt(textNo)) {
                    textBuf = textBuf.substring(1, textBuf.length);
                    if (from === -1) from = curSubtitles.from;
                    if (textBuf === '') {
                        console.log("FOUND");
                        return callback({
                            from: from.replace(',', '.'),
                            until: curSubtitles.until.replace(',', '.')
                        });
                    }
                } else {
                    textBuf = text;
                    from = -1;
                }
            }
        }

        console.log("NOTFOUND");
        callback('nomatch');
    });
}


app.get('/v/:text', function (req, res) {
    var text = req.params.text;

    matchTextOnMovie(text, function(times) {

        console.log(times);

        if (times === 'nomatch') {
            res.send("No match.");
            return;
        }

        from = convertTime(times.from);
        until = convertTime(times.until);
        duration = getDuration(from, until);

        if (duration > 120) {
            res.send("Movie snippet is too long! A snippet with a length of " + duration + " was found, but only"
                + " snippets of the length of max. 120 seconds are allowed.");
            return;
        }

        res.contentType('mp4');

        var proc = new ffmpeg({source: pathToMovie, nolog: true})
            .setStartTime(from)
            .setDuration(duration)
            .videoCodec(videoCodec)
            .audioCodec(audioCodec)
            .size('320x240')
            .videoBitrate(1024)
            .audioBitrate('128k')
            .fps(12)
            .toFormat('mp4')
            .on('start', function(commandLine) {
                console.log('Spawned Ffmpeg with command: ' + commandLine);
            })
            .on('end', function(err) {
                if(!err)
                {
                    console.log('conversion Done, sending file');
                    res.sendFile(__dirname + '/temp.mp4');
                }

            })
            .on('error', function(err){
                console.log('error: ', err);

            })
            .output('./temp.mp4')
            .run();
    })
});

app.use('/', express.static('gui'));
app.listen(port, function () {
    console.log('Example app listening on port ' + (port));
});
