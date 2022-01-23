/*
 * pub-server serve-sockets.js
 * web-socket server based on socket.io
 *
 * primary purpose (for now) is for watchers to trigger page reload
 * does nothing if opts.no-sockets is set (and disabled on production)
 *
 * Copyright (c) 2015-2022 Jürgen Leschner - github.com/jldec - MIT license
 */



var debug = require('debug')('pub:sockets');

module.exports = function serveSockets(server) {

  if (!(this instanceof serveSockets)) return new serveSockets(server);

  var opts = server.opts;
  if (opts.production || opts['no-sockets']) return;

  var io = server.io = require('socket.io')(server.http);
  var generator = server.generator;

  io.on('connection', function(socket) {
    debug('connect    %s', socket.id);
    generator.on('loaded', emitReload);

    socket.on('disconnect', function(){
      debug('disconnect %s', socket.id);
      generator.removeListener('loaded', emitReload);
    });

    function emitReload() { socket.emit('reload'); }
  });
};
