/*
 * Inspired by: http://stackoverflow.com/questions/4360060/video-streaming-with-html-5-via-node-js
 */
 
var http = require('http'),
    fs = require('fs'),
    util = require('util'),
    pump = require('pump'),
    mime = require('mime');

var reqNum = 0;

http.createServer(function (req, res) {
  console.log(req.url, req.method, JSON.stringify(req.headers));
  var path = 'video.mp4';
  var stat = fs.statSync(path);
  var total = stat.size;
  var contentType = mime.lookup(path);
  console.log('Content-Type: %s', contentType);

  if (req.headers['range']) {
    var range = req.headers.range;
    var parts = range.replace(/bytes=/, "").split("-");
    var partialstart = parts[0];
    var partialend = parts[1];
 
    var start = parseInt(partialstart, 10);
    var end = partialend ? parseInt(partialend, 10) : total-1;
    var chunksize = (end-start)+1;
    console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);
 
    var file = fs.createReadStream(path, {start: start, end: end});
    
    res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': contentType });
    pump(file, res, (function(num){
      return function(err) {
        console.log('pipe %d finished', num, err);
      };
    })(reqNum++));
  } else {
    console.log('ALL: ' + total);
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': contentType });
    var file = fs.createReadStream(path);
    pump(file, res, function(err) {
      console.log('pipe finished', err);
    });
  }
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');