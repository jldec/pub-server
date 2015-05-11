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

  // global opts

  // server retry with extensions when requested file not found - array
  self.extensions = 'extensions' in opts ? opts.extensions : ['.htm', '.html'];

  // server retry with trailing slash (similar to extensions) - bool
  self.trailingSlash = 'trailingSlash' in opts ? opts.trailingSlash : true;

  // additionally serve 'path/name' as just 'path' (1st match wins) - array
  // [inverse of generator.output() for pages with _href = directory]
  self.indexFiles = 'indexFiles' in opts ? opts.indexFiles : ['index.html'];

  if (self.indexFiles && self.indexFiles.length) {
    self.indexFilesRe = new RegExp(
      u.map(self.indexFiles, function(name) {
        return u.escapeRegExp('/' + name) + '$';
      }).join('|'));
  }
  else self.indexFiles = false; // allow use as boolean, false if empty

  // perform initial scan
  scanAll(function() {
    if (!server) {
      outputAll();
    }
    else {
      server.emit('static-scan');
      if (!server.generator.home) log('serving %s static files (%s %s %s)',
        u.size(self.file$), self.extensions, self.trailingSlash ? '../' : '', self.indexFiles);
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

    // only construct src, defaults, sendOpts etc. once
    if (!src) {
      sp.depth = sp.depth || 3; // default depth:3, 10min
      sp.maxAge = 'maxAge' in sp ? sp.maxAge : '10m';
      src = sp.src = fsbase(sp);
      sp.sendOpts = u.merge(
        u.pick(sp, 'maxAge', 'lastModified', 'etag'),
        { dotfiles:'ignore',
          index:false,      // handled at this level
          extensions:false, // ditto
          root:src.path } );
    }

    src.listfiles(function(err, files) {
      if (err) return cb(log(err));
      sp.files = files;
      self.scanCnt++;
      mapAllFiles();
      debug('static scan %s-deep %sms %s', sp.depth, timer(), sp.path.replace(/.*\/node_modules\//g, ''));
      cb();
    });
  }

  // recompute self.file$ hash of reqPath -> {sp, file}
  function mapAllFiles() {
    var file$ = {};
    var indexFileSlash = self.trailingSlash ? '/' : '';
    var dfile = '';

    // use reverse list so that first statics in config win e.g. over themes
    u.each(staticPathsRev, function(sp) {
      u.each(sp.files, function(file) {
        var reqPath;
        if (self.indexFiles && self.indexFilesRe.test(file)) {
          var shortPath = path.join(sp.route, file.replace(self.indexFilesRe, indexFileSlash));
          if (!file$[shortPath]) {
            reqPath = shortPath;
          }
        }
        reqPath = reqPath || path.join(sp.route, file);

        // only start logging dups on the last initial scan
        if (file$[reqPath] && self.scanCnt >= staticPathsRev.length) {
          log('duplicate static %s\n  %s\n  %s', file, file$[reqPath].sp.path, sp.path);
        }
        file$[reqPath] = {sp:sp, file:file}; // map reqPath to spo
        if (/^\/[^\/]+\.(htm|html)$/i.test(reqPath)) { dfile = reqPath; }
      });
    });

    // replace old map with recomputed map
    self.file$ = file$;
    self.defaultFile = dfile;
  }

  // only serve files in self.file$
  function serve(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    // surprisingly (bug?) express does not auto-decode req.path
    var reqPath = decodeURI(req.path);

    var file$ = self.file$;

    // try straight match
    var spo = file$[reqPath];

    if (!spo && !/\/$|\.[^\/]+$/.test(reqPath)) {

      // try adding trailing / and redirect if found
      if (self.trailingSlash) {
        var redir = reqPath + '/';
        spo = file$[redir];
        if (spo) {
          debug('static redirect %s %s', reqPath, redir);
          return res.redirect(302, redir); // use 302 to avoid browser redir caching
        }
      }

      // try extensions
      if (!spo && self.extensions) {
        for (var i=0; i<self.extensions.length; i++) {
          if (spo = file$[reqPath + self.extensions[i]]) break;
        }
      }
    }

    if (!spo) return next(); // give up

    debug('static %s%s', reqPath, (reqPath !== spo.file ? ' -> ' + spo.file : ''));

    send(req, spo.file, spo.sp.sendOpts).pipe(res);
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
      log('output %s %s static files', output.path, result.length);
      cb(result)
    });

    u.each(self.file$, function(spo, reqPath) {

      if (/^\/(admin|pub|server)\//.test(reqPath)) return done();

      var src = path.join(spo.sp.src.path, spo.file);
      var dest = path.join(output.path, spo.sp.route, spo.file);

      // copy will create dirs if necessary
      fs.copy(src, dest, function(err) {
        if (err) return done(log(err));
        result.push(dest);
        done();
      });

    });
  }

}

