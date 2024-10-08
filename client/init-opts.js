/*
 * init-opts.js
 *
 * async initOpts(cb) interface used by clientside _generator.js
 * invokes $.getJSON to fetch opts (with in-line serialized data) and plugins
 * if necessary fetch access token(s) from gatekeeper
 * possibly by directing browser to gatekeeper for auth roundabout
 * TODO: implement a mechanism to force re-authentication (logout gatekeeper)
 *
 * Copyright (c) 2015-2024 Jürgen Leschner - github.com/jldec - MIT license
*/

/* global $ */
/* global pubRef */

var dbg = require('debug');
var debug = dbg('pub:generator');
var asyncbuilder = require('asyncbuilder');
var u = require('pub-util');

require('pub-src-github'); // dummy require for browserify

module.exports = function initOpts(cb) {
  cb = u.onceMaybe(cb);

  var staticRoot = location.pathname.slice(0, location.pathname.indexOf(pubRef.href));
  debug('initOpts staticRoot: "' + staticRoot + '"');

  $.getJSON(staticRoot + '/pub/_opts.json')
    .fail(function(jqXHR) { cb(new Error(jqXHR.responseText)); })
    .done(function(respData) {

      // opts includes source.file data for all sources
      // see pub-server serve-scripts
      var opts = respData;

      // inject runtime-inferred staticRoot into opts
      opts.staticRoot = staticRoot;

      // enable debug tracing on client
      dbg.enable(opts.dbg);

      var ab = asyncbuilder(function(err) { cb(err, opts); });

      // recreate opts.source$ map (not serialized)
      // and initialize credentials for writable static sources
      opts.source$ = {};

      opts.sources.forEach(function(source) {
        opts.source$[source.name] = source;
      });
      ab.complete();

    });
};
