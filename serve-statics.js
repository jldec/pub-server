/*
 * pub-server serve-statics.js
 *
 * serve static files by scanning static paths at startup - default depth:2
 * allows many static paths and single files (like favicons) mounted on root
 * without stat'ing the file system on each path for each request
 * the tradeoff is a delay or 404s serving statics during initial scan
 *
 * uses send (same as express.static)
 *
 * TODO: pause and retry while scanning
 *       merge into pub-src-fs/fsbase?
 *       add file cache and/or files-list cache?
 *       extend to serve files from remote storage
 *       (supports only local files for now)
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:server:statics');
var u = require('pub-util');
var path = require('path');
var fsbase = require('pub-src-fs/fs-base');
var send = require('send');
var watch = require('./watch');

module.exports = function serveStatics(server) {

  if (!(this instanceof serveStatics)) return new serveStatics(server);
  var self = this;
  var opts = server.opts;
  var log = opts.log;
  var generator = server.generator;
  var staticPaths = opts.staticPaths;
  var staticPathsRev = opts.staticPaths.slice(0).reverse();


  self.file$ = {};  // maps each possible file request path -> staticPath
  self.scanCnt = 0; // how many scans have been completed

  // kickoff initial scan and deploy middleware
  scanAll();
  server.app.use(serve);
  server.app.get('/admin/statics', function(req, res) { res.send(Object.keys(self.file$)); })

  //--//--//--//--//--//--//--//--//--//--//--//--//--//

  // scan each staticPath and initialize watches
  function scanAll() {
    u.each(staticPaths, function(sp) {
      scan(sp, function(err) {
        if (!err && sp.watch && !opts['no-watch']) {
          watch(sp, u.throttleMs(
            function() {
              scan(sp, function() {
                generator.reload();
              });
            },
            sp.throttle || '10s' ));
        }
      });
    });
  }

  // repeatable scan for single staticPath
  function scan(sp, cb) {
    cb = u.onceMaybe(cb);
    var timer = u.timer();
    sp.route = sp.route || '/';

    var src = sp.src;

    // only construct src and sendOpts once
    if (!src) {
      sp.depth = sp.depth || 2; // default to depth:2
      src = sp.src = fsbase(sp);
      sp.sendOpts = u.merge(
        u.pick(sp, 'maxAge', 'lastModified', 'etag'),
        { dotfiles:'ignore',
          index:false,
          redirect:false,
          root:src.isfile() ? path.dirname(src.path) : src.path } );
    }

    src.listfiles(function(err, files) {
      if (err) return cb(log(err));
      sp.files = files;
      self.scanCnt++;
      indexFiles();
      debug('static scan %s-deep %sms %s', sp.depth, timer(), sp.path.replace(/.*\/node_modules\//g, ''));
      cb();
    });
  }

  function indexFiles() {
    var file$ = {};
    var cnt = 0;

    // use reverse list so that first statics in config win e.g. over themes
    u.each(staticPathsRev, function(sp) {

      // do nothing for staticPaths which don't have .files
      if (!sp.files) return;

      cnt++;
      u.each(sp.files, function(file) {
        var reqPath = path.join(sp.route, file);
        if (file$[reqPath] && self.scanCnt >= staticPathsRev.length) {
          log('overwriting duplicate static %s\n  old path: %s\n  new path: %s', reqPath,
              file$[reqPath].path,
              sp.path);
        }
        file$[reqPath] = sp;
      });
    });

    self.file$ = file$;
    if (cnt === staticPathsRev.length) { server.emit('static-scan'); }
  }

  // only serve files in self.file$
  function serve(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    // surprisingly (bug?) express does not auto-decode req.path
    path = decodeURI(req.path);

    var sp = self.file$[path];
    if (!sp) return next();

    debug('static %s', path);

    var path = path.slice(sp.route.length);
    send(req, path, sp.sendOpts).pipe(res);
  }

}
