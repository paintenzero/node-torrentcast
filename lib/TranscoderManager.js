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

const Transcoder = require('./Transcoder')
const crypto = require('crypto');


function TranscoderManager () {
  this._transcoders = {}
}

/**
 * @fn getPlaylist
 * @desc 
 */ 
function getPlaylist (uri) {
  var hash = crypto.createHash('sha256')
  hash.update(uri)
  var digest = hash.digest('hex')
  if (typeof this._transcoders[digest] === 'undefined') {
    var transcoder = new Transcoder(digest, uri)
    this._transcoders[digest] = transcoder
  }
  return this._transcoders[digest].playlistPath
}
TranscoderManager.prototype.getPlaylist = getPlaylist

module.exports = new TranscoderManager()