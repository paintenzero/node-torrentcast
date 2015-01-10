var express = require('express');
var rc = require('rc');
var optimist = require('optimist');
var routes = require('./routes');

process.title = 'torrentcast';

/**
 * Parse arguments, load settings from config file or defaults
 */
var argv = rc('torrentcast', {
  port: 3000,
  folder: 'torrents'
}, optimist
  .alias('p', 'port').describe('p', 'change the http port')
  .alias('f', 'folder').describe('f', 'folders to look for torrents file into')
  .alias('h', 'help').describe('h', 'shows this usage text').boolean('h')
  .argv
  );
routes.setArgv(argv);

//If user requested help instructions
if (argv.h) {
  console.log(optimist.help());
  process.exit();
}

/**
 * Start HTTP server
 */
var app = express();

app.get('/', routes.files);
app.get('/info/:file', routes.torrentInfo);
app.get('/probe/:torrent/:file', routes.start);

var server = app.listen(argv.port, function () {
  console.log('Server started! Please, visit http://localhost:%d/ with your Chrome browser!', argv.port);
});