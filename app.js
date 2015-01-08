var express = require('express');
var rc = require('rc');
var optimist = require('optimist');
var jade = require('jade');
var helper = require('./helper').helper;

process.title = 'peercast';

/**
 * Parse arguments, load settings from config file or defaults
 */
var argv = rc('peercast', {
  port: 3000,
  folder: 'torrents'
}, optimist
  .alias('p', 'port').describe('p', 'change the http port')
  .alias('f', 'folder').describe('f', 'folders to look for torrents file into')
  .alias('h', 'help').describe('h', 'shows this usage text').boolean('h')
  .argv
  );

//If user requested help instructions
if (argv.h) {
  console.log(optimist.help());
  process.exit();
}

/**
 * Start HTTP server
 */
var app = express();

app.get('/', function (req, res) {
  helper.getTorrentFiles(argv.folder).then(
    function (files) {
      var html = jade.renderFile('templates/files.jade', {files: files});
      res.write(html);
      res.end();
    },
    function (err) {
      console.err('Error reading file: %s', err);
      res.status(500);
      res.end();
    }
  );
});

var server = app.listen(argv.port, function () {
  console.log('Server started! Please, visit http://localhost:%d/ with your Chrome browser!', argv.port);
});