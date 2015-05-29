/**
 * pub-server serve-sessions.js
 *
 * boilerplate sessions using express-session
 * configured via config opts.session
 * uses redis if enabled via opts.redis
 * includes options for per-session request log and global system log
 * also provides server.isAuthorized() with acls (ADMIN, UPLOAD and READ)
 *
 * recommend using with redis
 * a) so that sessions survive pub-server restarts and
 * b) as a simple way to collect logs for tracking and analytics
 *
 * TODO: tease apart redis and sessions - redis should be available without server
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
**/

var u = require('pub-util');

module.exports = function serveSessions(server) {

  if (!(this instanceof serveSessions)) return new serveSessions(server);
  var self = this;

  // sugar
  var app         = server.app;
  var opts        = server.opts;
  var log         = opts.log;
  var sessionOpts = opts.session || {};
  var redisOpts   = opts.redis; // may be undefined

  // default opts values
  sessionOpts.name              = sessionOpts.name || 'sid';
  sessionOpts.resave            = sessionOpts.resave || false;
  sessionOpts.saveUninitialized = sessionOpts.saveUninitialized || false;
  sessionOpts.secret            = process.env.SSC || u.str(Math.random()).slice(2);

  // attach authz api to server (in case we move to non-session-based identity)
  server.isAuthorized = isAuthorized;

  // ACLs = comma separated lists of email addresses (note legacy env settings)
  sessionOpts.acl = sessionOpts.acl || {};
  sessionOpts.acl.ADMIN  = process.env.ACL_ADMIN  || process.env.ADMIN || '';
  sessionOpts.acl.EDIT   = process.env.ACL_EDIT;
  sessionOpts.acl.READ   = process.env.ACL_READ   || process.env.READ;
  sessionOpts.acl.UPLOAD = process.env.ACL_UPLOAD || process.env.UPLOAD;

  // if no auth configured, force all requests to authenticate as opts.user
  if (!opts.auth && opts.user) {
    opts.auth = { auto:opts.user } ;
    app.use(function(req, res, next) { req.user = opts.user; next(); });
    sessionOpts.acl.ADMIN = sessionOpts.acl.ADMIN + ',' + opts.user;
  }

  // memoized acl regexps (others are created on-demand)
  var aclRe = { ADMIN: reAccess(sessionOpts.acl.ADMIN) }

  if (opts.auth && opts.auth.auto) {
    log('auto-authenticating',
      isAuthorized('ADMIN', opts.user) ? '(admin)' : '',
      opts.user );
  }

  var expressSession = self.expressSession = require('express-session');

  // redis is optional
  if (redisOpts) {

    // allow true or 1 but coerce opts to {} to use defaults
    if (typeof redisOpts !== 'object') { redisOpts = {}; log('redis'); }
    else { log('redis', redisOpts); }

    // https://github.com/tj/connect-redis
    var RedisStore = require('connect-redis')(expressSession);

    // store must live in sessionOpts.store for expressSession to use it
    var store = self.store = sessionOpts.store = new RedisStore(redisOpts);
    var redis = self.redis = store.client;

    redis.on('error', function(err) { log(err); });
    server.on('shutdown', function() { redis.end(); });

    // push system log into redis
    if (redisOpts._log) {
      log.logger.on('log', redisLog);
      log.logger.on('error', function(e) { redisLog(e.stack || e); });
    }

    function redisLog(s) {
      redis.lpush(redisOpts._log, u.date().format('yyyy-mm-dd HH:MM:ss:l ') + s)
    }
  }

  app.use(expressSession(sessionOpts));

  if (sessionOpts.saveOldSessions) { saveOldSessions(); }

  if (!sessionOpts.noLogRequests) {
    app.use(sessionOpts.logRequestPath || '/server/log', logRequest);
  }

  // this needs to be called after auth handler
  self.authorizeRoutes = function() {

    // protect /admin and /pub routes - call login handler or pretend not found and throw
    app.use('/admin', function(req, res, next) { authorizeRoute('ADMIN', req, res, next) });
    app.use('/pub',   function(req, res, next) { authorizeRoute('EDIT',  req, res, next) });

    app.get('/admin/log', systemLog);
    app.get('/admin/opts', showopts);
    app.get('/admin/logout', logout);
  }

  //--//--//--//--//--//--//--//--//--//--//

  function logRequest(req, res) {
    var session = req.session;
    if (!session) return res.send( { noSession:1 } );

    // start by logging all query params
    var entry = u.clone(req.query || {});

    entry[sessionOpts.logTime || 't'] =
      session.ts ? (Date.now() - session.ts) / 1000 | 0 : 0;

    entry[sessionOpts.logPath || 'p'] = req.path;

    if (!session.log) {
      session.log = [];
      session.ts = Date.now();
      if (req.get('user-agent')) { session.ua = req.get('user-agent'); }
    }

    var n = session.log.push(entry);
    res.send( { n:n } );
  }

  function systemLog(req, res) {
    if (!redisOpts || !redisOpts._log) return res.status(500).send(['no redis log']);

    redis.lrange(redisOpts._log, 0, req.query.n || 200, function(err, log) {
      if (err) return res.status(500).send(err);
      res.send(log);
    });
  }

  function logout(req, res) {
    if (req.session) return req.session.destroy(function() { res.send('OK'); });
    res.send( { session: 'no-session' } );
  }

  function authorizeRoute(acl, req, res, next) {
    if (isAuthorized(acl, req.user)) return next();
    if (server.login) return server.login(req, res);
    var err = new Error(req.originalUrl);
    err.status = 404; // pretend it was not found
    throw err;
  }

  // low-level authz api - returns true if user matches or belongs to acl
  function isAuthorized(acl, user) {
    acl = u.str(acl).toUpperCase();
    user = u.str(user).toUpperCase();
    if (user && user === acl) return true;
    if (!aclRe[acl]) {
      aclRe[acl] = reAccess(sessionOpts.acl[acl] || process.env['ACL_' + acl]);
    }
    return aclRe[acl].test(user) || aclRe.ADMIN.test(user);
  }

  // turns ACLs into regexps
  function reAccess(s) {
    var list = s ? s.split(/[, ]+/) : [];      // avoid ['']
    return new RegExp(
      u.map(list, function(s) {
        return '^' + u.escapeRegExp(s) + '$';  // exact matches only
        }).join('|')                           // join([]) returns ''
      || '$(?=.)'                              // avoid default regexp /(?:)/
      , 'i');                                  // not case-sensitive
  }

  // replace session.store destroy handler with a replacement
  // which saves a copy of the session using sid_d first
  function saveOldSessions() {
    var db = self.store;
    var oldDestroy = db.destroy;
    db.destroy = newDestroy;
    return;

    // rename instead of delete
    function newDestroy(sid, cb) {
      db.get(sid, function(err, session) {
        if (err) return cb(err);
        if (!session) return cb();
        db.set(sid + '_d', session, function(err) {
          if (err) return cb(err);
          oldDestroy.call(db, sid, cb);
        });
      });
    }
  }

  function showopts(req, res) {
    res.send(u.htmlify(u.omit(opts, 'session')));
  }

}
