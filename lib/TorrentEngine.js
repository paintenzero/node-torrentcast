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
const helper = require('../lib/helper')
const debug = require('debug')('torrentcast:engine')
const torrentStream = require('torrent-stream')
const mime = require('mime')
const co = require('co')

/**
 * @class TorrentEngine
 */
function TorrentEngine (magnetURI, opts) {
  this._hash = helper.getHashFromMagnetURI(magnetURI)
  this._engine = torrentStream(magnetURI, opts)
  this._files = null
  Object.defineProperty(this, "tmpPath", { 
    get: function () { 
      return opts.tmp || '/tmp'
    }
  })

  // on engine ready handler
  this._engine.on('ready', function () {
    debug('Torrent ' + this._hash + ' is ready')
    this._files = []
    for (var i = 0; i < this._engine.files.length; ++i) {
      this._engine.files[i].deselect()
      this._files.push(this._engine.files[i].path)
    }
    this.emit('files', this._files)
  }.bind(this))
}

TorrentEngine.prototype.constructor = TorrentEngine
require('util').inherits(TorrentEngine, require('events'))

/**
 * @fn getFiles
 * @desc Return array of files in the torrent
 */
TorrentEngine.prototype.getFiles = function () {
  debug('Getting files for torrent ' + this._hash)
  return new Promise(function (resolve, reject) {
    if (this._files === null) {
      debug('Waiting for files list for torrent ' + this._hash)
      this.on('files', function () {
        resolve(this._files)
      }.bind(this))
      // TODO: add error handler
    } else {
      debug('Files list for torrent ' + this._hash + ' already received')
      resolve(this._files)
    }
  }.bind(this))
}

/**
 * @fn getFileSize
 * @desc return file's size
 * @param index of file
 * @return Promise for file size
 */ 
TorrentEngine.prototype.getFileSize = function (ind) {
  debug('Getting file size for file ' + ind + ' for torrent ' + this._hash)
  return co(function * () {
    var files = yield this.getFiles()
    if (ind < files.length) {
      return this._engine.files[ind].length
    } else {
      return Promise.reject(new Error('Cannot create file stream: out of bound'))
    }
  }.bind(this))
}

/**
 * @fn getFileMimeType
 * @desc return file's mime type
 * @param index of file
 * @return Promise for string with mime type
 */ 
TorrentEngine.prototype.getFileMimeType = function (ind) {
  debug('Getting mime type for file ' + ind + ' for torrent ' + this._hash)
  return co(function * () {
    var files = yield this.getFiles()
    if (ind < files.length) {
      return mime.lookup(this.tmpPath + '/' + files[ind])
    } else {
      return Promise.reject(new Error('Cannot create file stream: out of bound'))
    }
  }.bind(this))
}

/**
 * @fn getFileStream
 * @desc return file stream for the file
 * @param index of file
 * @param start set stream offset
 * @param end set stream end position
 */ 
TorrentEngine.prototype.getFileStream = function (ind, start, end) {
  debug('Getting stream for file ' + ind + ' for torrent ' + this._hash)
  return co(function *() {
    var files = yield this.getFiles()
    if (ind < files.length) {
      var opts = {}
      if (start !== undefined) opts.start = start
      if (end !== undefined) opts.end = end
      debug('Creating stream for file ' + ind + ' for torrent ' + this._hash + ' with options: ' + JSON.stringify(opts))
      var stream = this._engine.files[ind].createReadStream(opts)
      return stream
    } else {
      return Promise.reject(new Error('Cannot create file stream: out of bound'))
    }
  }.bind(this))
  
}

module.exports = TorrentEngine
