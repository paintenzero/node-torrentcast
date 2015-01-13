var helper = require('./helper');
var path = require('path');
var pump = require('pump');


var argv = null;
function getTorrentPath(tfile) {
  return argv.folder + path.sep + tfile;
}

var routes = {};

routes.setArgv = function (_argv) {
  argv = _argv;
  helper.setArgv(_argv);
};

routes.files = function (req, res) {
  helper.getTorrentFiles(argv.folder).then(
    function (files) {
      res.render('files', {
        files: files
      });
      res.end();
    },
    function (err) {
      console.err('Error reading torrents directory: %s', err);
      res.status(500);
      res.end();
    }
  );
};

routes.torrentInfo = function (req, res) {
  var filepath = getTorrentPath(req.params.file);
  helper.getTorrentInfo(filepath).then(
    function (info) {
      res.render('info', {
        torrentname: req.params.file,
        files: info.files
      });
      res.end();
    },
    function (err) {
      console.err('Error reading file %s: %s', filepath, err);
      res.status(500);
      res.end();
    }
  );
};


routes.probe = function (req, res) {
  var tfile = req.params.torrent;
  var file = req.params.file;

  helper.FFProbe(tfile, file).then(
    function (metadata) {
      metadata.format.duration = helper.humanDuration(metadata.format.duration);
      metadata.format.size = helper.humanFileSize(metadata.format.size, true);
      metadata.format.bit_rate = helper.humanFileSize(metadata.format.bit_rate, false);
      if (req.headers.accept !== undefined) {
        var acceptArr = req.headers.accept.split(',');
        var sent = false, i=0;
        for (i; i<acceptArr.length; ++i) {
          if (acceptArr[i] === 'application/json') {
            res.set('Content-Type', 'application/json');
            res.write(JSON.stringify(metadata));
            sent = true;
            break;
          }
        }
      }
      if (!sent) {
        res.render('probe', {
          torrentname: req.params.torrent,
          f: file,
          meta: metadata
        });
      }
      res.end();
    }
  ).catch(
    function (err) {
      console.log('Error getting file %s:%s stream: %s', tfile, file, err);
      res.end();
    }
  );
};
/**
 * Streams raw file to HTTP stream
 */
routes.rawFile = function (req, res) {
  var tfile = getTorrentPath(req.params.torrent);
  var file = req.params.file;

  res.set('Accept-Ranges', 'bytes');
  var total = 0, start, end;
  helper.getFileSize(tfile, file).then(
    function (size) {
      total = size;
      //Range support
      if (req.headers.range !== undefined) {
        var range = req.headers.range;
        var parts = range.replace(/bytes=/, "").split("-");
        var partialstart = parts[0];
        var partialend = parts[1];
        start = parseInt(partialstart, 10);
        end = partialend ? parseInt(partialend, 10) : total - 1;
        res.status(206);
        res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + total);
      } else {
        start = 0;
        end = total - 1;
      }
      res.set('Content-Length', (end - start) + 1);
      return helper.getMimeType(tfile, file);
    }
  ).then(function (mime) {
    res.set('Content-Type', mime);
    if (start === 0 && end === total - 1) {
      return helper.getTorrentFileStream(tfile, file);
    }
    return helper.getTorrentFileStream(tfile, file, {start: start, end: end});
  }).then(function (stream) {
    pump(stream, res);
  }).catch(function (err) {
    console.log('Error streaming raw file: %s', err);
    res.status(500);
    res.end();
  });
};

routes.trancodeFile = function (req, res) {
  var tfile = req.params.torrent;
  var file = req.params.file;

  helper.FFProbe(tfile, file).then(
    function (metadata) {
      res.set({
        'Content-Type': 'video/x-matroska',
        'X-Content-Duration': metadata.format.duration
      });
      return helper.getTranscodeStream(tfile, file, metadata);
    }
  ).then(
    function (stream) {
      pump(stream, res);
    }
  ).catch(
    function (err) {
      console.log('Error streaming transcoded file: %s', err);
      res.status(500);
      res.end();
    }
  );
};


module.exports = routes;
