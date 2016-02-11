/**
 * Copyright (c) 2016 Sergey Birukov <sergeyb26@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict'
const co = require('co')
const EngineManager = require('../lib/EngineManager')
const probe = require('../lib/Transcoder').probeVideo
const pump = require('pump')
const TranscoderManager = require('../lib/TranscoderManager')

var httpPort = 9000
module.exports.setHttpPort = function (newPort) {
  httpPort = newPort
}
function getLocalhostUri () {
  return 'http://localhost:' + httpPort
}

/**
 * @fn getVersion
 * @desc Outputs current version of the torrentcast
 * @param req HTTP request
 * @param res HTTP response
 * @return none
 */
function getVersion (req, res) {
  var pjson = require('../package.json')
  res.send(JSON.stringify({'version': pjson.version}))
  res.end()
}
module.exports.getVersion = getVersion

/**
 * @fn torrentInfo
 * @desc Outputs info about torrent specified
 * @param req HTTP request
 * @param res HTTP response
 * @return none
 */
function torrentInfo (req, res) {
  var magnet = req.params.magnet
  co(function * () {
    var files = yield EngineManager.getFilesInTorrent(magnet)
    res.send(JSON.stringify({'status': 'ok', 'files': files}))
  }).then(function () {
    res.end()
  }, function (err) {
    res.send(JSON.stringify({'status': 'error', 'description': err.message}))
    res.end()
  })
}
module.exports.torrentInfo = torrentInfo

/**
 * @fn probeVideo
 * @desc Runs ffprobe on selected file
 * @param req HTTP request
 * @param res HTTP response
 * @return none
 */
function probeVideo (req, res) {
  var magnet = req.params.magnet
  var fileInd = req.params.ind

  var rawUri = getLocalhostUri() + '/raw/' + encodeURIComponent(magnet) + '/' + fileInd
  co (function * () {
    var metadata = yield probe(rawUri)
    res.set('Content-Type', 'application/json')
    res.send(JSON.stringify(metadata))
  }).catch(function (err) {
    res.send(JSON.stringify({'status': 'error', 'description': err.message}))
    res.end()  
  })
}
module.exports.probe = probeVideo
  
/**
 * @fn rawFile
 * @desc Streams raw file to HTTP stream
 * @param req HTTP request
 * @param res HTTP response
 * @return none
 */
function rawFile (req, res) {
  var magnet = req.params.magnet
  var fileInd = req.params.ind
  
  co(function * () {
    var fileSize = yield EngineManager.getFileSize(magnet, fileInd)
    var mimeType = yield EngineManager.getFileMimeType(magnet, fileInd)
    var start = 0
    var end = fileSize - 1
    if (req.headers.range !== undefined) {
      var range = req.headers.range
      var parts = range.replace(/bytes=/, '').split('-')
      var partialstart = parts[0]
      var partialend = parts[1]
      start = parseInt(partialstart, 10)
      end = partialend ? parseInt(partialend, 10) : fileSize - 1
      res.status(206)
      res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + fileSize)
    }
    
    res.set({
      'Content-Length': (end - start) + 1,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    })
    
    var stream = yield EngineManager.getFileStream(magnet, fileInd)
    pump(stream, res)
  }).catch(function (err) {
    res.send(JSON.stringify({'status': 'error', 'description': err.message}))
    res.end()
  })
}
module.exports.rawFile = rawFile

/**
 * @fn hlsPlaylist
 * @desc Returns hls streaming playlist (m3u8) for the selected file
 * @param req HTTP request
 * @param res HTTP response
 * @return none
 */
function hlsPlaylist (req, res) {
  var magnet = req.params.magnet
  var fileInd = req.params.ind
  
  var rawUri = getLocalhostUri() + '/raw/' + encodeURIComponent(magnet) + '/' + fileInd
  var playlist = TranscoderManager.getPlaylist(rawUri)
  
  res.send(JSON.stringify({'status': 'ok', 'playlist_path': playlist}))
  res.end()
}
module.exports.hlsPlaylist = hlsPlaylist

/**
 * Serve the playlist
 */
/*
routes.playlist = function (req, res) {
  var filepath = '/tmp/hls/torrentcast.m3u8'
  Q.ninvoke(fs, 'stat', filepath).then(
    function (stats) {
      res.set('Content-Type', 'application/vnd.apple.mpegurl')
      res.set('Content-Length', stats.size)
      res.set('Last-Modified', stats.mtime)
      res.set('Connection', 'keep-alive')
      res.set('Access-Control-Allow-Origin', '*')
      res.set('Accept-Ranges', 'bytes')

      // Range support
      var start, end
      if (req.headers.range !== undefined) {
        var range = req.headers.range
        var parts = range.replace(/bytes=/, '').split('-')
        var partialstart = parts[0]
        var partialend = parts[1]
        start = parseInt(partialstart, 10)
        end = partialend ? parseInt(partialend, 10) : stats.size - 1
        res.status(206)
        res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + stats.size)
      } else {
        start = 0
        end = stats.size - 1
      }
      var fileStream = fs.createReadStream(filepath, {start: start, end: end})

      pump(fileStream, res)
    },
    function (err) {
      res.status(500)
      res.write(err.message)
      res.end()
    }
  ).catch(function (err) {
    res.status(500)
    res.write(err.message)
    res.end()
  })
}

routes.serveTS = function (req, res) {
  var filepath = path.sep + 'tmp' + path.sep + 'hls' + path.sep + req.params.file
  Q.ninvoke(fs, 'stat', filepath).then(
    function (stats) {
      res.set({
        'Content-Type': 'video/mp2t',
        'Content-Length': stats.size,
        'Last-Modified': stats.mtime,
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes'
      })

      // Range support
      var start, end
      if (req.headers.range !== undefined) {
        var range = req.headers.range
        var parts = range.replace(/bytes=/, '').split('-')
        var partialstart = parts[0]
        var partialend = parts[1]
        start = parseInt(partialstart, 10)
        end = partialend ? parseInt(partialend, 10) : stats.size - 1
        res.status(206)
        res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + stats.size)
      } else {
        start = 0
        end = stats.size - 1
      }
      var fileStream = fs.createReadStream(filepath, {start: start, end: end})
      pump(fileStream, res)
    },
    function (err) {
      res.status(500)
      res.write(err.message)
      res.end()
    }
  )
}*/

// module.exports = routes
