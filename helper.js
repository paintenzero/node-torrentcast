var Q = require('q');
var fs = require('fs');
var torrentStream = require('torrent-stream');
var path = require('path');

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


var helper = {};
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
 */
helper.getTorrentInfo = function (file) {
  var deferred = Q.defer();
  Q.nfapply(fs.readFile, [file]).done(
    function (buffer) {
      var engine = torrentStream(buffer);
      engine.on('ready', function () {
        var ret = {files: []}, ext;
        engine.files.forEach(function (file) {
          ext = path.extname(file.name);
          if (isVideoExtension(ext)) {
            ret.files.push({
              name: path.basename(file.name, ext),
              size: humanFileSize(file.length, false)
            });
          }
        });
        ret.files.sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
        deferred.resolve(ret);
      });
    }
  );
  return deferred.promise;
};

exports.helper = helper;