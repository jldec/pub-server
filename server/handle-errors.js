/*
 * pub-server handle-errors.js
 * NOTE:
 * - this should be the last handler loaded by the server
 * - depends on serve-pages being invoked before this
 *
 * copyright 2015-2019, Jurgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:server');
var path = require('path');
var ppath = path.posix || path;
var u = require('pub-util');

module.exports = function handleErrors(server) {

  // sugar
  var opts = server.opts;
  var log = opts.log;
  var app = server.app;
  var generator = server.generator;

  app.use('/server/echo', testEcho);

  // dev/test routes
  if (!opts.production) {
    app.use('/admin/testthrow', testThrow);
    app.use('/admin/testerr',   testErr);
    app.use('/admin/testpost',  testPost);
    app.use('/admin/testget',   testGet);
  }

  // mount 404 and 500 handlers
  app.use(notFound);
  app.use(errHandler);

  return;

  //--//--//--//--//--//--//--//--//--//--//

  // return 404 except for html pages
  function notFound(req, res) {

    var ext = ppath.extname(req.path);
    if ((!ext || /\.htm|\.html/i.test(ext)) && !u.size(req.query)) return error(404, req, res);

    debug('404 %s', req.originalUrl);
    res.status(404).end();
  }

  // error handler middleware
  // body-parser returns err.status = 400 on POST with invalid json (application/json content-type)
  //
  function errHandler(err, req, res) {
    if (!err.status) { log(err); }
    error(err.status || 500, req, res, u.str(err));
  }

  // general purpose error response
  function error(status, req, res, msg) {
    debug('%s %s', status, req.originalUrl);
    msg = msg || '';

    var page = generator.page$['/' + status];

    // 404 with no matching status page => redirect to home
    if (!page && status === 404) {
      if (generator.home) return res.redirect(302, '/');
      if (server.statics.defaultFile) return res.redirect(302, server.statics.defaultFile);
    }

    // avoid exposing error pages unless authorized
    if (page) {
      if (!server.isPageAuthorized || !server.isPageAuthorized(req, page)) {
        if (server.login) return server.login(req, res);
        else page = null;
      }
    }

    if (!page) return res.status(status).send(u.escape(msg));

    res.status(status).send(
      generator.renderDoc(page)
        .replace(/%s/g, u.escape(msg)) // TODO - replace with humane.js or proper template
        .replace('<body', '<body data-err-status="' + status + '"' + (msg ? ' data-err-msg="' + u.escape(msg) + '"' : ''))
    );
  }

  function testThrow() {
    throw new Error('test throw');
  }

  function testErr(req, res) {
    log(new Error('test err'));        // will throw if no on('error') handler - see session.log
    error(403, req, res, '/admin/testerr'); // forbidden
  }

  function testPost(req, res) {
    log('/admin/testpost', req.body);
    res.status(200).send('OK');
  }

  function testGet(req, res) {
    log('/admin/testget', req.query);
    res.status(200).send('OK');
  }

  function testEcho(req, res) {
    res.send(echoreq(req));
  }

  function echoreq(req) {
    return {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      query: req.query,
      params: req.params,
      body: req.body,
      now: Date(),
      user: req.user,
      sessionID: req.sessionID,
      session: req.session
    };
  }
};
