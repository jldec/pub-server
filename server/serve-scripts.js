/*
 * pub-server serve-scripts.js
 *
 * serves browserified scripts
 * as well as /pub/* routes for opts, plugins and source files.

 * API: serveStatics(opts, server) returns serveStatics object
 *   server optional, if not passed, no routes served
 *   serveStatics.outputAll() - copy scripts to outputs[0] (for pub -O)
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:scripts');
var u = require('pub-util');
var through = require('through2');
var fspath = require('path');
var fs = require('fs-extra');
var babelify = require('babelify');

module.exports = function serveScripts(opts, server) {

  if (!(this instanceof serveScripts)) return new serveScripts(opts);
  var self = this;
  var log = opts.log;

  self.serveRoutes = serveRoutes;
  self.outputAll = outputAll;     // for pub -O

  var browserify = require('browserify-middleware');

  // expose build-bundle for output to file
  browserify.buildBundle = require('browserify-middleware/lib/build-bundle.js');

  /* browsrify pregen with production is slow */
  if ((opts.outputOnly || opts.minify) && !opts.dbg) { browserify.settings.mode = 'production'; }

  browserify.settings( { ignore: ['request', 'request-debug', 'graceful-fs', 'resolve', 'osenv', 'tmp'],
                         ignoreMissing: false } );

  browserify.settings.production('cache', '1h');

  // prepare array of browserscripts including builtins
  self.scripts = u.map(opts.browserScripts, function(script) {
    var o = {
      route: script.route,
      path:  script.path,
      delay: script.delay,
      opts:  u.omit(script, 'path', 'route', 'inject', 'maxAge')
    }
    if ('maxAge' in script) { o.opts.cache = script.maxAge || 'dynamic'; }
    return o;
  });

  self.scripts.push( {
    route: '/server/pub-ux.js',
    path: fspath.join(__dirname, '../client/pub-ux.js')
  } );

  // editor scripts
  if (opts.editor) {

    self.scripts.push( {
      route: '/pub/_generator.js',
      path:  fspath.join(__dirname, '../client/_generator.js'),
    } );

    self.scripts.push( {
      route: '/pub/_generator-plugins.js',
      path:  fspath.join(__dirname, '../client/_generator-plugins.js'),
      opts:  { transform: [transformPlugins] }
    } );
  }

  return;

  //--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//

  // deploy browserify scripts and editor/admin handlers
  function serveRoutes(server) {
    var app = server.app;
    var generator = server.generator;

    // route browserscripts, including builtins
    u.each(self.scripts, function(script) {
      var handler = browserify(script.path, script.opts);
      if (script.delay) {
        var delayed = function(req, res) {
          debug(req.path, 'waiting', script.delay);
          setTimeout(function() {
            debug(req.path, 'done waiting', script.delay);
            handler(req, res);
          }, u.ms(script.delay));
        }
      }
      app.get(script.route, delayed || handler);
    });

    // editor api
    if (opts.editor) {
      app.post('/pub/_files', function(req, res) {
        generator.serverSave(req.body, req.user, function(err, results) {
          if (err) return res.status(500).send(err);
          res.status(200).send(results);
        })
      });
      app.get('/pub/_opts.json', function(req, res) {
        res.set('Cache-Control', 'no-cache');
        res.send(serializeOpts(server.generator));
      });
    }

    // admin api
    app.get('/admin/flushCaches', function(req, res) {
      generator.flushCaches(function(err, results) {
        if (err) return res.status(500).send(err);
        res.status(200).send(results);
      })
    });

    app.get('/admin/reloadSources', function(req, res) {
      res.send(generator.reloadSources(req.query.src));
    });

    app.get('/admin/outputPages', function(req, res) {
      res.send(generator.outputPages(req.query.output));
    });

    app.get('/admin/reload', function(req, res) {
      generator.reload()
      res.status(200).send('OK');
    });
  }

  // publish browserscripts
  function outputAll(generator) {

    var dest = (opts.outputs && opts.outputs[0]);
    if (!dest) return log('scripts.outputAll: no output');

    u.each(self.scripts, function(script) {
      var out = fspath.join(dest.path, script.route);
      var ws = fs.createOutputStream(out);
      ws.on('finish', function() {
        log('output script: %s', out);
      });
      ws.on('error', log);

      // from browserify-middleware index.js (may need to do noParse map also)
      var options = browserify.settings.normalize(script.opts);
      var bundler = browserify.buildBundle(script.path, options);
      if (!opts.dbg) { bundler.plugin(require.resolve('minifyify'), { map:false } ); }
      bundler.bundle().pipe(ws);
    });

    if (opts.editor) {
      var out = fspath.join(dest.path, '/pub/_opts.json');
      fs.outputJson(out, serializeOpts(generator, true, dest), function(err) {
        log(err || 'output opts: %s', out);
      });
    }
  }

  // browserify transform for sending plugins
  // invoked using require('./__plugins')
  function transformPlugins(path) {
    if (!/_generator-plugins/.test(path)) return through();
    return through(
      function tform(chunk, enc, cb) { cb() }, // ignore input
      function flush(cb) {
        this.push(requirePlugins());
        cb();
      }
    );
  }

  function requirePlugins() {
    var s = u.reduce(opts.generatorPlugins.reverse(),
      function(memo, plugin) {
        return memo + 'require("' + plugin.path + '")(generator);\n';
      }, '');

    return s;
  }

  function serializeOpts(generator, toStatic, outputDest) {
    var sOpts = u.omit(opts, 'output$', 'source$', 'log', 'session');

    // provide for detection of static hosted editor
    if (toStatic) { sOpts.staticHost = true; }

    // pass output.fqImages -> static opts for use in static editor/generator
    if (outputDest && outputDest.fqImages) { sOpts.fqImages = outputDest.fqImages; }

    sOpts.staticPaths = u.map(opts.staticPaths, function(staticPath) {
      return u.omit(staticPath, 'files', 'src');
    });
    sOpts.outputs = u.map(opts.outputs, function(output) {
      return u.omit(output, 'files', 'src');
    });
    sOpts.sources = u.map(opts.sources, function(source) {
      var rawSource = u.omit(source, 'files', 'src', 'file$', 'fragments', 'updates', 'snapshots', 'drafts', 'cache');
      rawSource.files = source.type === 'FILE' ?
        generator.serializeFiles(source.files) :
        source.files;
      return rawSource;
      });
    return sOpts;
  }

}
