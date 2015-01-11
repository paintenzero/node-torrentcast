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

var helper = {};
/**
 * Sets options given from command line and defaults
 */
helper.setArgv = function (_argv) {
  argv = _argv;
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
  var ffCommand = ffmpeg('http://127.0.0.1:' + argv.port + '/raw/' + encodeURIComponent(torrent) + '/' + encodeURIComponent(filename));
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

module.exports = helper;
module.exports.humanDuration = humanDuration;
module.exports.humanFileSize = humanFileSize;