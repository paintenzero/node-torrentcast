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
const debug = require('debug')('torrentcast:engineman')
const TorrentEngine = require('./TorrentEngine')
const helper = require('../lib/helper')

/**
 * @class EngineManager
 * @desc Stores and manages all torrent engines used
 */
function EngineManager () {
  this.engines = {}
  this.engineOpts = {}
}

EngineManager.prototype.constructor = EngineManager
require('util').inherits(EngineManager, require('events'))

/**
 * @fn _createEngine
 * @desc Create torrent-stream engine
 * @param magnetURI Torrent magnet URI or torrent file buffer
 * @return TorrentEngine instance
 */
EngineManager.prototype._createEngine = function (magnetURI) {
  debug('Creating new torrent engine for hash ' + magnetURI)
  var e = new TorrentEngine(magnetURI, this.engineOpts)
  return e
}

/**
 * @fn getEngineForURI
 * @desc Returns torrent stream engine for given hash
 * @param magnetURI Torrent magnet URI
 * @return TorrentEngine instance
 */
EngineManager.prototype.getEngineForURI = function (magnetURI) {
  var thash = helper.getHashFromMagnetURI(magnetURI)
  if (thash === null) {
    return null
  }
  if (typeof this.engines[thash] === 'undefined') {
    var e = this._createEngine(magnetURI)
    this.engines[thash] = e
  }
  return this.engines[thash]
}

/**
 * @fn getFilesInTorrent
 * @desc Returns files array for torrent specified
 * @param magnetURI magnet uri
 * @return Promise for array of files in torrent
 */
EngineManager.prototype.getFilesInTorrent = function (magnetURI) {
  return new Promise(function (resolve, reject) {
    var e = this.getEngineForURI(magnetURI)
    if (e !== null) {
      co(function *() {
        var files = yield e.getFiles()
        resolve(files)
      })
    } else {
      reject(new Error('Incorrect magnet URI'))
    }
  }.bind(this))
}

module.exports = new EngineManager()
