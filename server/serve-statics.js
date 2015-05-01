/*
 * pub-server serve-statics.js
 *
 * if no server is passed in, copy static inventory to outputs[0] (for pub -O)
 *
 * serve static files by scanning static paths at startup - default depth:3
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
var fs = require('fs-extra');
var path = require('path');
var fsbase = require('pub-src-fs/fs-base');
var send = require('send');
var watch = require('./watch');

module.exports = function serveStatics(opts, server) {

  if (!(this instanceof serveStatics)) return new serveStatics(opts, server);
  var self = this;
  var log = opts.log;
  var staticPaths = opts.staticPaths;
  var staticPathsRev = opts.staticPaths.slice(0).reverse();

  self.file$ = {};  // maps each possible file request path -> staticPath
  self.scanCnt = 0; // how many scans have been completed
  self.defaultFile = ''; // default file to serve if no other pages available

  // perform initial scan
  scanAll(function() {
    if (!server) {
      outputAll();
    }
  });

  if (server) {
    // deploy middleware before scanAll() completes and then return
    server.app.use(serve);
    server.app.get('/admin/statics', function(req, res) { res.send(Object.keys(self.file$)); })
  }

  //--//--//--//--//--//--//--//--//--//--//--//--//--//

  // scan each staticPath and initialize watches
  // no error propagation, just log(err)
  function scanAll(cb) {
    var done = u.after(staticPaths.length, u.maybe(cb));
    u.each(staticPaths, function(sp) {
      scan(sp, function(err) {
        if (!err && server && sp.watch && !opts['no-watch']) {
          watch(sp, u.throttleMs(
            function() {
              scan(sp, function() {
                server.generator.reload();
              });
            },
            sp.throttle || '10s' ));
        }
        done();
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
      sp.depth = sp.depth || 3; // default to depth:3
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
    var dfile = '';

    // use reverse list so that first statics in config win e.g. over themes
    u.each(staticPathsRev, function(sp) {

      // do nothing for staticPaths which don't have .files
      if (!sp.files) return;

      cnt++;
      u.each(sp.files, function(file) {
        var reqPath = path.join(sp.route, file);
        if (file$[reqPath] && self.scanCnt >= staticPathsRev.length) {
          log('duplicate static %s\n  old path: %s\n  new path: %s', reqPath,
              file$[reqPath].path,
              sp.path);
        }
        file$[reqPath] = sp;
        if (/^\/[^\/]+\.(htm|html)$/i.test(reqPath)) { dfile = reqPath; }
      });
    });

    // first recompute file$ and defaultFile and then switcheroo
    self.file$ = file$;
    self.defaultFile = dfile;
    if (server && cnt === staticPathsRev.length) { server.emit('static-scan'); }
  }

  // only serve files in self.file$
  function serve(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    // surprisingly (bug?) express does not auto-decode req.path
    var reqPath = decodeURI(req.path);

    var sp = self.file$[reqPath];
    if (!sp) return next();

    debug('static %s', reqPath);

    var file = reqPath.slice(sp.route.length);
    send(req, file, sp.sendOpts).pipe(res);
  }

  // copy static files to opts.outputs[0].path preserving reqPath routes
  // no error propagation, just log(err)
  function outputAll(cb) {
    cb = u.maybe(cb);

    var output = opts.outputs[0];
    var count = u.size(self.file$);
    var result = [];

    if (!output || !count) return cb(log('outputAll: no ouput'));

    var done = u.after(count, function() {
      log('output %s static files', result.length);
      cb(result)
    });

    u.each(self.file$, function(sp, reqPath) {

      if (/^\/(admin|pub|server)\//.test(reqPath)) return done();

      var src = path.join(sp.sendOpts.root, reqPath.slice(sp.route.length));
      var dest = path.join(output.path, reqPath);

      // copy will create dirs if necessary
      fs.copy(src, dest, function(err) {
        if (err) return done(log(err));
        result.push(dest);
        done();
      });

    });
  }

}

