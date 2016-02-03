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

/**
 * @class TorrentEngine
 */
function TorrentEngine (magnetURI, opts) {
  this._hash = helper.getHashFromMagnetURI(magnetURI)
  this._engine = torrentStream(magnetURI, opts)
  this._files = null
  this._engine.on('ready', function () {
    debug('Torrent ' + this._hash + ' is ready')
    this._files = []
    this._engine.files.forEach(function (file) {
      this._files.push(file.path)
    }.bind(this))
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

module.exports = TorrentEngine
