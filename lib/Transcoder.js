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

const ffmpeg = require('fluent-ffmpeg')
const path = require('path')
const publicFolder = path.resolve(__dirname + '/../public/')
const mkdirp = require('mkdirp')

function Transcoder (hash, fileUri) {
  Object.defineProperty(this, "playlistPath", { 
    get: function () { 
      return '/streams/' + hash + '/video.m3u8'
    }
  })
  const localPath = path.normalize(publicFolder + this.playlistPath)
  
  mkdirp(path.dirname(localPath), function (err) {
    if (err) throw new Error('Cannot create video transcoded directory: ' + err.message)
    else {
      this._ffmpeg = ffmpeg(fileUri)
	.native()
	.size('1280x720')
	.videoCodec('libx264')
	.audioCodec('aac')
	.outputOptions('-strict experimental')
        .output(localPath)
        .run()
    }
  }.bind(this))
  
}

/**
 * @fn probeVideo
 */
function probeVideo (uri) {
  return new Promise(function (resolve, reject) {
    ffmpeg.ffprobe(uri, function (err, metadata) {
      if (err) reject(err)
      else resolve(metadata) 
    })
  })
}
Transcoder.prototype.probeVideo = probeVideo
Transcoder.probeVideo = probeVideo

module.exports = Transcoder
