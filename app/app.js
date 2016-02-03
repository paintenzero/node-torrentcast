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
const parseArgs = require('minimist')
const express = require('express')
const morgan = require('morgan')
const debug = require('debug')('torrentcast')
const routes = require('./routes')

process.title = 'torrentcast'

/**
 * Parse arguments, load settings from config file or defaults
 */
const argv = parseArgs(process.argv.slice(2), {
  'boolean': ['help'],
  'alias': {
    'h': 'help',
    'p': 'port'
  },
  'default': {
    'port': 9000
  }
})

// routes.setArgv(argv)

// If user requested help instructions
if (argv.h) {
  printUsage()
  process.exit(-1)
}

/**
 * Start HTTP server
 */
const app = express()

app.use(morgan('combined'))
app.use(express.static('public'))
app.get('/version', routes.getVersion)
app.get('/info/:magnet', routes.torrentInfo)
/*
app.get('/probe/:torrent/:file', routes.probe)
app.get('/raw/:torrent/:file', routes.rawFile)
app.get('/cast/:torrent/:file', routes.castFile)
app.get('/hls/torrentcast.m3u8', routes.playlist)
app.get('/hls/:file', routes.serveTS)
app.get('/casttest', routes.castTest)
*/

app.listen(argv.port, function () {
  debug('Server started! Please, visit http://localhost:%d/ with your Chrome browser!', argv.port)
})

function printUsage () {
  var tabs = '\t\t'
  console.log('Usage: %s [-h] [-p port]', process.title)
  console.log('  -p, --port%sChange the http port (default: 9000)', tabs)
  console.log('  -h, --help%sShows this help', tabs)
}
