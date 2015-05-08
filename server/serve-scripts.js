/*
 * pub-server serve-scripts.js
 *
 * serves browserified scripts
 * as well as /pub/* routes for opts, plugins and source files.
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:server:scripts');
var u = require('pub-util');
var through = require('through2');
var fspath = require('path');

module.exports = function serveScripts(server) {

  var app = server.app;
  var generator = server.generator;
  var opts = server.opts;

  var browserify = require('browserify-middleware');
  if (!opts.dbg) { browserify.settings.mode = 'production'; }

  browserify.settings( { ignore: ['request', 'request-debug', 'pub-src-fs', 'resolve', 'osenv', 'tmp'],
                         ignoreMissing: false } );

  browserify.settings.production('cache', '1h');

  // debug(browserify);

  // deploy middleware
  u.each(opts.browserScripts, function(script) {

    // translate maxAge -> cache for consistency with static send
    var browserifyOpts = u.omit(script, 'path', 'route', 'maxAge');
    if ('maxAge' in script) { browserifyOpts.cache = script.maxAge || 'dynamic'; }

    app.get(script.route, browserify(script.path, browserifyOpts));
  });

  // browser client for pub-server notifications
  app.get('/server/pub-ux.js',
    browserify(fspath.join(__dirname, '../client/pub-ux.js')));

  // editor api
  if (opts.editor) {

    app.get('/pub/_generator.js',
      browserify(fspath.join(__dirname, '../client/_generator.js')));

    app.get('/pub/_generator-plugins.js',
      browserify(fspath.join(__dirname, '../client/_generator-plugins.js'),
                { transform: [transformPlugins] } ));

    app.get('/pub/_opts.json', function(req, res) {
      res.set('Cache-Control', 'no-cache');
      res.send(serializeOpts());
    });

    app.post('/pub/_files', function(req, res) {
      generator.serverSave(req.body, req.user, function(err, results) {
        if (err) return res.status(500).send(err);
        res.status(200).send(results);
      })
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

  return;

  //--//--//--//--//--//--//--//--//--//--//--//--//--//--//--//

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

  function serializeOpts() {
    var serializable = u.omit(opts, 'output$', 'source$', 'log', 'session');
    serializable.staticPaths = u.map(opts.staticPaths, function(staticPath) {
      return u.omit(staticPath, 'files', 'src');
    });
    serializable.outputs = u.map(opts.outputs, function(output) {
      return u.omit(output, 'files', 'src');
    });
    serializable.sources = u.map(opts.sources, function(source) {
      var rawSource = u.omit(source, 'files', 'src', 'file$', 'fragments', 'updates', 'snapshots', 'drafts', 'cache');
      rawSource.files = source.type === 'FILE' ?
        server.generator.serializeFiles(source.files) :
        source.files;
      return rawSource;
      });
    return serializable;
  }

}