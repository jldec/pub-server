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

/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

var debug = require('debug')('pub:scripts');
var u = require('pub-util');
var through = require('through2');
var fspath = require('path'); // for platform specific path.join
var uglify = require('uglify-es');
var asyncbuilder = require('asyncbuilder');

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
  if ((opts.outputOnly || opts.minify) && !opts.dbg) {
    browserify.settings.mode = 'production';
  }

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
  }

  // output all browserscripts with uglify logic from
  // https://github.com/ForbesLindesay/browserify-middleware/blob/master/lib/build-response.js
  function outputAll(output, generator, cb) {
    cb = u.maybe(cb);
    output = output || opts.outputs[0];

    var files = [];
    var filemap = [];

    var omit = output.omitRoutes;
    if (omit && !u.isArray(omit)) { omit = [omit]; }

    // TODO: re-use similar filter in server/serve-statics and generator.output
    var filterRe = new RegExp( '^(/admin/|/server/' +
                (opts.editor ? '' : '|/pub/') +
                       (omit ? '|' + u.map(omit, u.escapeRegExp).join('|') : '') +
                               ')');

    // builder results collected in files and filemap
    var ab = asyncbuilder(function(err) {
      if (err) return cb(err, filemap);
      output.src.put(files, function(err) {
        if (err) return cb(err, filemap);
        cb(null, filemap);
      });
    });

    u.each(self.scripts, function(script) {
      if (filterRe.test(script.route)) return;
      var scriptDone = ab.asyncAppend();

      var time = u.timer();

      // reuse browserify-middleware with current production or debug options
      var options = browserify.settings.normalize(script.opts);
      var bundler = browserify.buildBundle(script.path, options);
      bundler.bundle(function (err, buf) {
        if (err) {
          log(err);
          scriptDone(err, script.route);
          return;
        }
        var str = buf.toString();
        if (!opts.dbg) {
          try {
            // slow! TODO: offer a way to cache between builds
            str = uglify.minify(str, {}).code;
          }
          catch(e) {}
        }
        files.push( { path:script.route, text:str } );
        filemap.push( { path:script.route } );
        log('output script: %s (%d bytes, %d ms)', script.route, str.length, time());
        scriptDone(null, script.route);
      });
    });

    if (opts.editor) {
      var optsPath = '/pub/_opts.json';
      var optsStr = JSON.stringify(serializeOpts(generator, true, output));
      files.push( { path:optsPath, text:optsStr } );
      filemap.push( { path:optsPath } );
      log('output %s (%d bytes)', optsPath, optsStr.length);
    }

    ab.complete();
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
      var rawSource = u.omit(source, 'files', 'src', 'file$', 'fragments', 'updates', 'snapshots', 'drafts', 'cache', 'redisOpts');
      rawSource.files = source.type === 'FILE' ?
        generator.serializeFiles(source.files) :
        source.files;
      return rawSource;
    });
    return sOpts;
  }

};
