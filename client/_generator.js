/*
 * _generator.js
 *
 * browserify entry point to load generator into client
 * served at /pub/_generator.js by serve-scripts.js
 * depends on jquery
 *
 * Copyright (c) 2015-2024 Jürgen Leschner - github.com/jldec - MIT license
*/

/* global $ */
/* global pubRef */

var debug = require('debug')('pub:generator');
var initOpts = require('./init-opts');

$.ajaxSetup( { cache: true } );

// init client-side opts
initOpts(function(err, opts) {

  // start client-side pub-generator
  var generator = window.generator = require('pub-generator')(opts);
  opts.log.logger.noErrors = true;

  // get browserified generator plugins - avoid caching across directories
  $.getScript(pubRef.relPath + '/pub/_generator-plugins.js?_=' + encodeURIComponent(opts.basedir))
    .fail(function(jqXHR) {
      opts.log(new Error(jqXHR.responseText));
    })
    .done(function() {
      debug('plugins loaded');

      // load sources
      generator.load(function(err) {
        if (err) return opts.log(err);
        debug('generator loaded');

        // hook custom timers
        generator.emit('init-timers', false);

        // initialize editor-ui
        if (window.onGeneratorLoaded) {
          window.onGeneratorLoaded(generator);
          debug('ui loaded');
        }
      });
    });
});
