/*
 * pub-server serve-scripts.js
 *
 * serves browserified scripts
 * as well as /pub/* routes for opts, plugins and source files.

 * API: serveStatics(opts, server) returns serveStatics object
 *   server optional, if not passed, no routes served
 *   serveStatics.outputAll() - copy scripts to outputs[0] (for pub -O)
 *
 * copyright 2015-2020, Jürgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:scripts');
var u = require('pub-util');
var through = require('through2');
var fspath = require('path'); // for platform specific path.join
var fs = require('fs-extra');

module.exports = function serveScripts(opts) {

  if (!(this instanceof serveScripts)) return new serveScripts(opts);
  var self = this;
  var log = opts.log;

  self.serveRoutes = serveRoutes;
  self.outputAll = outputAll;     // for pub -O

  var browserify = require('browserify-middleware');

  // expose build-bundle for output to file
  browserify.buildBundle = require('browserify-middleware/lib/build-bundle.js');

  /* browserify pregen with production is slow */
  if ((opts.outputOnly || opts.minify) && !opts.dbg) { browserify.settings.mode = 'production'; }

  browserify.settings( { ignore: ['resolve', 'osenv', 'tmp'],
                         ignoreMissing: false } );

  browserify.settings.production('cache', '1h');

  // prepare array of browserscripts including builtins
  self.scripts = u.map(opts.browserScripts, function(script) {
    var o = {
      route: script.route,
      path:  script.path,
      delay: script.delay,
      opts:  u.omit(script, 'path', 'route', 'inject', 'maxAge')
    };
    if ('maxAge' in script) { o.opts.cache = script.maxAge || 'dynamic'; }
    return o;
  });

  self.scripts.push( {
    route: '/server/pub-sockets.js',
    path: fspath.join(__dirname, '../client/pub-sockets.js')
  } );

  // editor scripts
  if (opts.editor) {

    self.scripts.push( {
      route: '/pub/pub-ux.js',
      path: fspath.join(__dirname, '../client/pub-ux.js')
    } );

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
        };
      }
      app.get(script.route, delayed || handler);
    });

    // editor api
    if (opts.editor) {
      app.post('/pub/_files', function(req, res) {
        generator.serverSave(req.body, req.user, function(err, results) {
          if (err) return res.status(500).send(err);
          res.status(200).send(results);
        });
      });
      app.get('/pub/_opts.json', function(req, res) {
        res.set('Cache-Control', 'no-cache');
        res.send(serializeOpts(server.generator));
      });
    }

    app.get('/admin/reloadSources', function(req, res) {
      res.send(generator.reloadSources(req.query.src));
    });

    app.get('/admin/outputPages', function(req, res) {
      generator.outputPages(req.query.output, function(err, results) {
        if (err) return res.status(500).send(err);
        res.status(200).send(u.flatten(results));
      });
    });

    app.get('/admin/logPages', function(req, res) {
      res.send(generator.logPages());
    });

    app.get('/admin/reload', function(req, res) {
      generator.reload();
      res.status(200).send('OK');
    });
  }

  // publish browserscripts
  function outputAll(generator) {

    var output = (opts.outputs && opts.outputs[0]);
    if (!output) return log('scripts.outputAll: no output');

    var omit = output.omitRoutes;
    if (omit && !u.isArray(omit)) { omit = [omit]; }

    // TODO: re-use similar filter in server/serve-statics and generator.output
    var filterRe = new RegExp( '^(/admin/|/server/' +
                (opts.editor ? '' : '|/pub/') +
                       (omit ? '|' + u.map(omit, u.escapeRegExp).join('|') : '') +
                               ')');

    u.each(self.scripts, function(script) {
      if (filterRe.test(script.route)) return;

      var out = fspath.join(output.path, script.route);
      fs.ensureFileSync(out);
      var ws = fs.createWriteStream(out);
      var time = u.timer();
      ws.on('finish', function() {
        log('output script: %s (%d bytes, %d ms)', out, ws.bytesWritten, time());
      });
      ws.on('error', log);

      // reuse browserify-middleware with current production or debug options
      var options = browserify.settings.normalize(script.opts);
      var bundler = browserify.buildBundle(script.path, options);
      bundler.bundle().pipe(ws);
    });

    if (opts.editor) {
      var out = fspath.join(output.path, '/pub/_opts.json');
      fs.ensureFileSync(out);
      fs.outputJson(out, serializeOpts(generator, true, output), function(err) {
        log(err || 'output opts: %s', out);
      });
    }
  }

  // browserify transform for sending plugins
  // invoked using require('./__plugins')
  function transformPlugins(path) {
    if (!/_generator-plugins/.test(path)) return through();
    return through(
      function tform(chunk, enc, cb) { cb(); }, // ignore input
      function flush(cb) {
        this.push(requirePlugins());
        cb();
      }
    );
  }

  function requirePlugins() {
    var s = u.reduce(opts.generatorPlugins.reverse(), function(memo, plugin) {
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

};
