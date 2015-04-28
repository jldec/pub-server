/*
 * pub-server watch-sources.js
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
 */

var watch = require('./watch');

module.exports = function watchSources(generator) {
  var opts = generator.opts;

  opts.sources.forEach(function(src) {
    if (src.watch && !opts['no-watch']) {
      watch(src, function() {
        src._reloadFromSource = true;
        generator.reload();
      });
      src._watching = true; // see generator/update
    }
  });
}
