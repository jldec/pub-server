/*
 * pub-server watch.js
 * wrapper around watch library (chokidar)
 * used by serve-statics and watch-sources
 * TODO: dedup watches and look at aggregating watch paths with single watch
 *
 * Copyright (c) 2015-2024 Jürgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:watch');

var path = require('path');
var ppath = path.posix || path;
var chokidar = require('chokidar');
var u = require('pub-util');

module.exports = function watch(src, onEvent) {

  var wDir = src.glob ? ppath.join(src.path, src.glob) : src.path;

  var wOpts = u.assign(

    { depth:         (src.depth && src.depth - 1) || 0,  // watcher depth 0 = src depth 1
      ignoreInitial: true,
      interval:      '1s' },

    src.watch);

  wOpts.interval = u.ms(wOpts.interval);

  debug('watching %s depth:%s, %s', src.name, wOpts.depth, wDir);

  chokidar.watch(wDir, wOpts)
    .on('all', function(evt, path) {
      debug('%s %s %s', evt, src.name, path);
      onEvent(evt, path);
    });

};
