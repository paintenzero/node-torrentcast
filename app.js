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
  folder: 'torrents',
  tmp: '/tmp/torrentcast',
  rtmp: 'rtmp://127.0.0.1/live',
  hls: 'http://127.0.0.1/hls'
}, optimist
  .alias('p', 'port').describe('p', 'change the http port')
  .alias('f', 'folder').describe('f', 'folders to look for torrents file into')
  .alias('t', 'tmp').describe('t', 'temporary folder to save downloaded file into')
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

app.set('views', __dirname + '/templates');
app.set('view engine', 'jade');
app.get('/', routes.files);
app.get('/info/:file', routes.torrentInfo);
app.get('/probe/:torrent/:file', routes.probe);
app.get('/raw/:torrent/:file', routes.rawFile);
<<<<<<< HEAD
app.get('/cast/:torrent/:file', routes.castFile);
=======
app.get('/transcode/:torrent/:file', routes.trancodeFile);
>>>>>>> 8bfbd167abeb0b734b973a0939f47c86f308909c


var server = app.listen(argv.port, function () {
  console.log('Server started! Please, visit http://localhost:%d/ with your Chrome browser!', argv.port);
});
