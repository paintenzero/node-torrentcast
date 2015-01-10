var jade = require('jade');
var helper = require('./helper');

var routes = {};
var argv = null;

routes.setArgv = function (_argv) {
  argv = _argv;
};

routes.files = function (req, res) {
  helper.getTorrentFiles(argv.folder).then(
    function (files) {
      var html = jade.renderFile('templates/files.jade', {files: files});
      res.write(html);
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
  var filepath = argv.folder + '/' + req.params.file;
  helper.getTorrentInfo(filepath).then(
    function (info) {
      var html = jade.renderFile('templates/info.jade', {
        torrentname: req.params.file,
        files: info.files
      });
      res.write(html);
      res.end();
    },
    function (err) {
      console.err('Error reading file %s: %s', filepath, err);
      res.status(500);
      res.end();
    }
  );
};


routes.start = function (req, res) {
  var tfile = req.params.torrent;
  var file = req.params.file;
  var fstream = helper.getTorrentFileStream(tfile, file);
  res.write('ok');
  res.end();
}


module.exports = routes;