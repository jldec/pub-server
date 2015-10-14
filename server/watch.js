/*
 * pub-server watch.js
 * wrapper around watch library (chokidar)
 * used by serve-statics and watch-sources
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:server:watch');

var path = require('path');
var chokidar = require('chokidar');
var u = require('pub-util');

module.exports = function watch(src, onEvent) {

  var wDir = src.glob ? path.join(src.path, src.glob) : src.path;

  var wOpts = u.merge({},

    { depth:         src.depth || 1,
      ignoreInitial: true,
      interval:      '1s' },

    src.watch);

  wOpts.interval = u.ms(wOpts.interval);

  debug('watching depth:%s, %s', wOpts.depth, src.path);

  chokidar.watch(wDir, wOpts)
  .on('all', function(evt, path) {
    debug('%s %s %s', evt, src.name, path);
    onEvent(evt, path);
  });

}
