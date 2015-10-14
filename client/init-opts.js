/*
 * init-opts.js
 *
 * async initOpts(cb) interface used by clientside _generator.js
 * invokes $.getJSON to fetch opts (with in-line serialized data) and plugins
 * if necessary fetch access token(s) from gatekeeper
 * possibly by directing browser to gatekeeper for auth roundabout
 * TODO: implement a mechanism to force re-authentication (logout gatekeeper)
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
*/


var dbg = require('debug')
var debug = dbg('pub:generator');
var asyncbuilder = require('asyncbuilder');
var u = require('pub-util');

var srcGitHub = require('pub-src-github'); // dummy require for browserify

module.exports = function initOpts(cb) {
  cb = u.onceMaybe(cb);

  $.getJSON('./_opts.json')
  .fail(function(jqXHR) { cb(new Error(jqXHR.responseText)); })
  .done(function(respData) {

    // opts includes source.file data for all sources
    // see pub-server serve-scripts
    var opts = respData;

    // enable debug tracing on client
    dbg.enable(opts.dbg);

    // auto-detect staticRoot assuming editor lives under /pub/
    if (opts.staticHost) {
      var staticRoot = u.parentHref(location.pathname, true);
      if (staticRoot !== '/') { opts.staticRoot = staticRoot; }
    }

    var ab = asyncbuilder(function(err) { cb(err, opts); });

    // recreate opts.source$ map (not serialized)
    // and initialize credentials for writable static sources
    opts.source$ = {};

    opts.sources.forEach(function(source) {
      opts.source$[source.name] = source;

      // connect to static editor sources: github or dropbox
      if (opts.staticHost && source.staticSrc) {
        if (source.gatekeeper) {
          var append = ab.asyncAppend();
          debug('authenticating ' + source.gatekeeper);
          $.getJSON(source.gatekeeper + '/status' + location.search)
          .fail(function(jqXHR) { append(new Error(jqXHR.responseText)); })
          .done(function(status) {

            // if not logged in, send browser to gatekeeper for oauth
            if (!status || !status.access_token) {
              location.assign(source.gatekeeper +
                '?ref=' + encodeURIComponent(location.href));
            }
            // finally we can create the source adapter to save to
            else {
              source.auth = status;
              source.src = require(source.staticSrc)(source);
            }
            debug(status);
            append(status);
          });
        }
      }
    });
    ab.complete();

  });
}
