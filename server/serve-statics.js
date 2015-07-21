/*
 * pub-server serve-statics.js
 *
 * serve static files by scanning static paths at startup - default depth:3
 * allows many static paths and single files (like favicons) mounted on root
 * without stat'ing the file system on each path for each request
 * the tradeoff is a delay or 404s serving statics during initial scan
 *
 * API: serveStatics(opts, cb) returns serveStatics object, calls cb after scan
 *   serveStatics.serveRoutes(server) - serve routes and start watches
 *   serveStatics.outputAll() - copy static inventory to outputs[0] (for pub -O)
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

module.exports = function serveStatics(opts, cb) {

  if (!(this instanceof serveStatics)) return new serveStatics(opts, cb);
  var self = this;
  var log = opts.log;
  var staticPaths = opts.staticPaths;
  var staticPathsRev = opts.staticPaths.slice(0).reverse();

  var defaultOutput = (opts.outputs && opts.outputs[0]);
  var outputExtension = defaultOutput && defaultOutput.extension;
  var noOutputExtensions = outputExtension === '';

  self.file$ = {};  // maps each possible file request path -> staticPath
  self.scanCnt = 0; // how many scans have been completed
  self.defaultFile = ''; // default file to serve if no other pages available
  self.server;      // initialized by self.serveRoutes(server)

  // global opts

  // server retry with extensions when requested file not found - array
  self.extensions = ('extensions' in opts) ? opts.extensions :
    noOutputExtensions ? [] : ['.htm', '.html'];

  // server retry with trailing slash (similar to extensions) - bool
  self.trailingSlash = 'noTrailingSlash' in opts ? !opts.noTrailingSlash : true;

  // additionally serve 'path/index' as just 'path' (1st match wins) - array
  // [inverse of generator.output() for pages with _href = directory]
  self.indexFiles =
    'indexFiles' in opts ? opts.indexFiles :
    noOutputExtensions ? ['index'] : ['index.html'];

  // send Content-Type=text/html header for extensionless files
  self.noHtmlExtensions = opts.noHtmlExtensions || noOutputExtensions;

  if (self.indexFiles && self.indexFiles.length) {
    self.indexFilesRe = new RegExp(
      u.map(self.indexFiles, function(name) {
        return u.escapeRegExp('/' + name) + '$';
      }).join('|'));
  }
  else self.indexFiles = false; // allow use as boolean, false if empty

  self.serveRoutes = serveRoutes;
  self.outputAll = outputAll;      // for pub -O

  scanAll(function(err) {
    if (self.server && self.server.generator && !self.server.generator.home) {
      log('%s static files', u.size(self.file$));
    };
    cb && cb(err, self.file$);
  });

  return;

  //--//--//--//--//--//--//--//--//--//--//--//--//--//

  // deploy middleware and initialize watches
  // note: this may be called before scanAll() completes
  function serveRoutes(server) {
    self.server = server;
    server.app.use(serve);
    server.app.get('/admin/statics', function(req, res) { res.send(Object.keys(self.file$)); })
    watchAll();
    return self; // chainable
  }


  // scan each staticPath
  // no error propagation, just log(err)
  function scanAll(cb) {
    var done = u.after(staticPaths.length, u.maybe(cb));
    u.each(staticPaths, function(sp) {
      scan(sp, function(err) {
        done();
      });
    });
  }

  function watchAll() {
    u.each(staticPaths, function(sp) {
      if (sp.watch && !opts['no-watch']) {
        watch(sp, u.throttleMs(function() {
          scan(sp, function() {
            if (self.server && self.server.generator) {
              self.server.generator.reload();
            }
          });
        }, sp.throttle || opts.throttleReload || '10s'));
      }
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
      sp.depth = sp.depth || 5;
      sp.maxAge = 'maxAge' in sp ? sp.maxAge : '10m';
      src = sp.src = fsbase(sp);
      if (src.isfile()) { sp.depth = 1; }
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
      debug(files.length > 10 ? '[' + files.length + ' files]' : u.pluck(files, 'filepath'));
      cb();
    });
  }

  // recompute self.file$ hash of reqPath -> {sp, file}
  function mapAllFiles() {
    var file$ = {};
    var indexFileSlash = self.trailingSlash ? '/' : '';
    var dfile = '';

    // use reverse list so that first statics in config win e.g. over packages
    u.each(staticPathsRev, function(sp) {
      u.each(sp.files, function(entry) {
        var file = entry.filepath;
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

    if (self.noHtmlExtensions && !path.extname(spo.file)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }

    debug('static %s%s', reqPath, (reqPath !== spo.file ? ' -> ' + spo.file : ''));

    send(req, spo.file, spo.sp.sendOpts).pipe(res);
  }

  // copy static files to defaultOutput preserving reqPath routes
  // no error propagation, just log(err)
  function outputAll(cb) {
    cb = u.maybe(cb);

    var count = u.size(self.file$);
    var result = [];

    if (!defaultOutput || !count) return cb(log('statics.outputAll: no output'));

    var done = u.after(count, function() {
      log('output %s %s static files', defaultOutput.path, result.length);
      cb(result)
    });

    var filterRe = new RegExp('^/(admin|server' +
                              (opts.editor ? '' : '|pub') +
                              ')/');

    u.each(self.file$, function(spo, reqPath) {
      if (filterRe.test(reqPath)) return done();

      var src = path.join(spo.sp.src.path, spo.file);
      var dest = path.join(defaultOutput.path, spo.sp.route, spo.file);

      // copy will create dirs if necessary
      fs.copy(src, dest, function(err) {
        if (err) return done(log(err));
        result.push(dest);
        done();
      });

    });
    return self; // chainable
  }

}
