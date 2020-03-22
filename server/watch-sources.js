/*
 * pub-server watch-sources.js
 *
 * copyright 2015-2020, Jürgen Leschner - github.com/jldec - MIT license
 */

var watch = require('./watch');

module.exports = function watchSources(generator) {
  var opts = generator.opts;
  var log = opts.log;

  opts.sources.forEach(function(src) {
    if (src.watch && !opts['no-watch']) {
      watch(src, function(evt, path) {
        log('source %s %s', evt, path);
        src._reloadFromSource = true;
        generator.reload(); // throttled
      });
      src._watching = true; // see generator/update
    }
  });
};
