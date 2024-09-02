/*
 * pub-sockets.js
 * browserify entry point
 * connect/disconnect socket.io
 *
 * TODO: consolidate with socket.io script
 * Copyright (c) 2015-2024 Jürgen Leschner - github.com/jldec - MIT license
*/

/* global io */

var debug = require('debug')('pub:sockets');

if (window.io) {

  debug('socket:connect');
  var socket = io();

  socket.on('reload', function() {
    // in-browser generator case, just notify
    if (window.generator && window.generator.emit) {
      return window.generator.emit('notify', 'save');
    }
    debug('socket:reload');
    location.reload();
  });

  window.addEventListener('beforeunload', function() {
    debug('socket:disconnect');
    socket.disconnect();
  });

} else console.log('no socket.io');
