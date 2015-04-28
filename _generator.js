/*
 * _generator.js
 *
 * browserify entry point to load generator into client
 * invokes $.getJSON to fetch opts (with in-line serialized data) and plugins
 * depends on jquery
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
*/

var dbg = require('debug')
var debug = dbg('pub:generator');

$.ajaxSetup( { cache: true } );

$.getJSON('/pub/_opts.json')
.fail(function(jqXHR) { alert('unable to load /pub/_opts.json'); })
.done(function(respData) {

  // opts includes source.file data for all sources
  // see pub-server serve-scripts
  var opts = respData;

  // enable debug tracing on client
  dbg.enable(opts.dbg);

  // recreate opts.source$ map (not serialized)
  opts.source$ = {};
  opts.sources.forEach(function(source) {
    opts.source$[source.name] = source;
  });

  // start client-side pub-generator
  var generator = window.generator = require('pub-generator')(opts);

  // get browserified generator plugins - avoid caching across directories
  $.getScript('/pub/_generator-plugins.js?_=' + encodeURIComponent(opts.basedir))
  .fail(function(jqXHR) { alert('unable to load generator plugins'); })
  .done(function(script) {
    debug('plugins loaded');

    generator.load(function(err) {
      if (err) return opts.log(err);
      debug('generator loaded');

      // hook custom timers
      generator.emit('init-timers', false);

      // slightly ugly way to notify client (editor) that generator is ready
      if (window.onGeneratorLoaded) {
        window.onGeneratorLoaded(generator);
        debug('ui loaded');
      }
    });
  });
});