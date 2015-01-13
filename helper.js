var Q = require('q');
var fs = require('fs');
var torrentStream = require('torrent-stream');
var path = require('path');
var mime = require('mime');
var ffmpeg = require('fluent-ffmpeg');

var torrentEngines = {}, argv = {};

/**
 * Returns human readable file size
 * Source: http://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable
 */
function humanFileSize(bytes, si) {
  var thresh = si ? 1000 : 1024;
  if (bytes < thresh) {
    return bytes + ' B';
  }
  var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  var u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (bytes >= thresh);
  return bytes.toFixed(1) + ' ' + units[u];
}
/**
 * Returns human readable movie duration
 */
function humanDuration(secs) {
  secs = Math.floor(secs);
  if (secs < 60) {
    return secs + ' sec';
  }
  var mins = Math.floor(secs / 60);
  secs -= mins * 60;
  if (mins < 60) {
    return mins + ' min ' + secs + ' sec';
  }
  var hours = Math.floor(mins / 60);
  mins -= hours * 60;
  return hours + ' h ' + mins + ' min ' + secs + ' sec';
}
/**
 * Returns true if needle is in haystack
 */
function in_array(needle, haystack) {
  var i, length_array;
  for (i = 0, length_array = haystack.length; i < length_array; i++) {
    if (needle === haystack[i]) {
      return true;
    }
  }
  return false;
}
/**
 * Returns true if given extension is a video extension
 */
var videoExtensions = ['.avi', '.mkv', '.mp4', '.ogv', '.ogg', '.m4v', '.mp2', '.mpe', '.mpv', '.mpg', '.mpeg', '.m2v', '.wmv', '.mov', '.qt', '.3gp', '.asf', '.rmvb', '.rm', '.yuv', '.flv', '.webm'];
function isVideoExtension(ext) {
  return in_array(ext, videoExtensions);
}


/**
 * Returns buffer
 */
function getTorrentBuffer(torrent) {
  return Q.nfapply(fs.readFile, [torrent]);
}
/**
 *
 */
function getEngineForTorrentFile(torrentFileName) {
  var deferred = Q.defer();
  var torrentBaseName = path.basename(torrentFileName);
  if (torrentEngines[torrentBaseName] === undefined) {
    getTorrentBuffer(torrentFileName).done(
      function (buf) {
        var engine = torrentStream(buf, {
          path: argv.tmp + path.sep + torrentBaseName
        });
        torrentEngines[torrentBaseName] = engine;
        engine.on('ready', function () {
          engine.files.forEach(function (file) {
            file.deselect();
          });
          engine.sortedVideoFiles = engine.files.filter(function (f) {
            var ext = path.extname(f.name);
            return isVideoExtension(ext);
          });
          engine.sortedVideoFiles.sort(function (a, b) {
            return a.name.localeCompare(b.name);
          });
          deferred.resolve(engine);
        });
      },
      function (err) {
        deferred.reject(err);
      }
    );
  } else {
    var anEngine = torrentEngines[torrentBaseName];
    if (anEngine.files.length === 0) {
      anEngine.on('ready', function () {
        deferred.resolve(anEngine);
      });
    } else {
      deferred.resolve(anEngine);
    }
  }
  return deferred.promise;
}
/**
 * Selects torrent file for download
 */
function startDownloadingFile(torrent, filename) {
  var deferred = Q.defer();
  getEngineForTorrentFile(torrent).done(
    function (engine) {
      var resolved = false;
      engine.files.forEach(function (tfile) {
        if (tfile.name === filename) {
          resolved = true;
          tfile.select();
          deferred.resolve(argv.tmp + path.sep + path.basename(torrent) + path.sep + tfile.path);
        }
      });
      if (!resolved) {
        deferred.reject(new Error('File not found!'));
      }
    },
    function (err) { //If reading .torrent was errorneous
      deferred.reject(err);
    }
  );
  return deferred.promise;
}

function getFileURI(torrent, filename) {
  return 'http://127.0.0.1:' + argv.port + '/raw/' + encodeURIComponent(torrent) + '/' + encodeURIComponent(filename);
}
/**
 * Returns stream with specified codec_type
 */
function get_stream(metadata, codec_type) {
  var i;
  for (i = 0; i < metadata.streams.length; ++i) {
    if (metadata.streams[i].codec_type === codec_type) {
      return metadata.streams[i];
    }
  }
  return null;
}

var helper = {};
/**
 * Sets options given from command line and defaults
 */
helper.setArgv = function (_argv) {
  argv = _argv;
  if (argv.ffmpeg_path !== undefined) {
    ffmpeg.setFfmpegPath(argv.ffmpeg_path);
  }
  if (argv.ffprobe_path !== undefined) {
    ffmpeg.setFfprobePath(argv.ffprobe_path);
  }
};
/**
 * Returns torrent files list from given folder
 */
helper.getTorrentFiles = function (dir) {
  var deferred = Q.defer();
  Q.nfapply(fs.readdir, [dir]).done(
    function (files) {
      var ret = [];
      var i = 0, f, ext;
      for (i; i < files.length; ++i) {
        f = files[i];
        if (f.length > 8) {
          ext = path.extname(f);
          if (ext === '.torrent') {
            ret.push({
              name: path.basename(f, ext),
              link: '/info/' + f
            });
          }
        }
      }
      deferred.resolve(ret);
    }
  );
  return deferred.promise;
};
/**
 * Returns info for given torrent file
 * @param <string> torrent filename with path
 * @return {files:[
            { 
              name: <string>,
              path: <string>,
              length: <int>
            }, ...
           ]}
 */
helper.getTorrentInfo = function (tfile) {
  var deferred = Q.defer();
  getEngineForTorrentFile(tfile).done(
    function (engine) {
      var ret = {files: []}, i, file, ext;
      for (i = 0; i < engine.sortedVideoFiles.length; ++i) {
        file = engine.sortedVideoFiles[i];
        ext = path.extname(file.name);
        ret.files.push({
          name: path.basename(file.name, ext),
          size: humanFileSize(file.length, false),
          index: i,
          link: '/probe/' + path.basename(tfile) + '/' + file.name
        });
      }
      deferred.resolve(ret);
    },
    function (err) {
      deferred.reject(err);
    }
  );
  return deferred.promise;
};
/**
 *
 */
helper.getFileSize = function (torrent, filename) {
  var deferred = Q.defer();
  getEngineForTorrentFile(torrent).then(
    function (engine) {
      var resolved = false;
      engine.files.forEach(function (file) {
        if (file.name === filename) {
          resolved = true;
          deferred.resolve(file.length);
        }
      });
      if (!resolved) {
        deferred.reject(new Error('Not found'));
      }
    },
    function (err) {
      deferred.reject(err);
    }
  );
  return deferred.promise;
};
/**
 *
 */
helper.getMimeType = function (torrent, filename) {
  var deferred = Q.defer();
  startDownloadingFile(torrent, filename).then(
    function (path) {
      var existsResult = function (exists) {
        if (exists) {
          deferred.resolve(mime.lookup(path));
        } else {
          setTimeout(function () {
            fs.exists(path, existsResult);
          }, 1000);
        }
      };
      fs.exists(path, existsResult);
    },
    function (err) {
      deferred.reject(err);
    }
  );
  return deferred.promise;
};
/**
 *
 */
helper.FFProbe = function (torrent, filename) {
  var uri = 'video.mp4';//getFileURI(torrent, filename);
  var ffCommand = ffmpeg(uri);
  return Q.ninvoke(ffCommand, "ffprobe");
};
/**
 * Returns readonly stream for file in torrent
 */
helper.getTorrentFileStream = function (torrent, filename, opts) {
  var deferred = Q.defer();
  getEngineForTorrentFile(torrent).done(
    function (engine) {
      var resolved = false;
      engine.files.forEach(function (tfile) {
        if (tfile.name === filename) {
          resolved = true;
          deferred.resolve(tfile.createReadStream(opts));
        }
      });
      if (!resolved) {
        deferred.reject(new Error('File not found!'));
      }
    },
    function (err) { //If reading .torrent was errorneous
      deferred.reject(err);
    }
  );
  return deferred.promise;
};
/**
 *
 */
helper.getTranscodeStream = function (torrent, filename, metadata) {
  var deferred = Q.defer();
  var uri = 'video.mp4';//getFileURI(torrent, filename);

  var videoStream = get_stream(metadata, 'video');

  var ffCommand = ffmpeg(uri);
  // if (metadata.format_name !== 'mp4') {
    ffCommand.format('mkv');
  // }
  // if (videoStream.codec_name !== 'mpeg4' && videoStream.codec_name !== 'h264' && videoStream.codec_name !== 'vp8') {
    ffCommand.videoCodec('libx264');
  // }
  // if (1) {
    ffCommand.audioCodec('libmp3lame')
      // .audioFrequency(44100)
      // .audioChannels(2)
      // .audioBitrate(128 * 1000);
  // }
  ffCommand.on('error', function(err, stdout, stderr) {
    console.log('An error while transcoding occurred: %s', err.message);
    console.log('-----------\n%s', stdout);
    console.log('-----------\n%s', stderr);
  });

  deferred.resolve(ffCommand.stream());
  return deferred.promise;
};

module.exports = helper;
module.exports.humanDuration = humanDuration;
module.exports.humanFileSize = humanFileSize;
