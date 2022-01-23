/*
 * pub-server serve-pages.js
 *
 * serves dynamically rendered pages
 * with page http-headers, checks http methods
 * also serves redirects
 *
 * Copyright (c) 2015-2022 Jürgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:server:pages');
var u = require('pub-util');
var mime = require('mime');
var path = require('path');
var ppath = path.posix || path;

module.exports = function servePages(server) {

  var generator = server.generator;
  var opts = server.opts;

  server.isPageAuthorized = isPageAuthorized;

  server.app.use(pages);
  server.app.use(redirects);

  //--//--//--//--//--//--//--//--//--//--//--//--//--//

  function pages(req, res, next) {

    generator.getPage(req.url, function(err, page) {

      if (err || !page || !checkMethod(req, page)) return next();

      if (!isPageAuthorized(req, page)) {
        if (!server.login || page.nologin) return next();
        return server.login(req, res);
      }

      debug('page %s', page._href);

      // make req and res available to dynamic pages
      generator.req = req;
      generator.res = res;

      resHeaders(res, page);
      res.send(generator.renderDoc(page));

    });
  }

  function isPageAuthorized(req, page) {
    return (!page.access && opts.publicPages) ||
           (page.access === 'everyone') ||
           (server.isAuthorized &&
             server.isAuthorized(page.access, req.user));
  }

  function checkMethod(req, page) {
    return page.postonly   ? /POST/i.test(req.method) :
           page.postandget ? /POST|GET|HEAD/i.test(req.method) :
                             /GET|HEAD/i.test(req.method);
  }

  function resHeaders(res, page) {
    var headers = page['http-header'];
    if (typeof headers === 'string') { headers = [ headers ]; }
    u.each(headers, function(s) {
      var m = s.match(/^\s*([^:]+?)\s*:\s*(\S.*?)\s*$/);
      if (m) { res.set(m[1], m[2]); }
    });

    var ext = ppath.extname(page._href);
    if (!ext || res.getHeader('Content-Type')) return;
    res.set('Content-Type', mime.getType(ext));

    res.set('Access-Control-Allow-Origin', '*');
  }

  function redirects(req, res, next) {
    var newUrl = generator.redirect(req.url); // returns {status:, url:} or null
    if (!newUrl) return next();
    debug('%s redirect %s to %s', newUrl.status, req.url, newUrl.url);
    res.redirect(newUrl.status, newUrl.url);
  }

};
