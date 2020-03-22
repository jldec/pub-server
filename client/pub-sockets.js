/*
 * pub-sockets.js
 * browserify entry point
 * connect/disconnect socket.io
 *
 * TODO: consolidate with socket.io script
 * copyright 2015-2020, Jürgen Leschner - github.com/jldec - MIT license
*/

/* global $ */
/* global io */

var debug = require('debug')('pub:sockets');

if (window.io) {

  debug('socket:connect');
  var socket = io();

  socket.on('reload', function() {
    // in-browser generator case, just notify
    if (window.generator) {
      return window.generator.emit('notify', 'save');
    }
    debug('socket:reload');
    location.reload();
  });

  $(window).on('beforeunload', function() {
    debug('socket:disconnect');
    socket.disconnect();
  });

} else console.log('no socket.io');
