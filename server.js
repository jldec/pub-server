/*
 * pub server.js
 *
 * launches (express) server after resolving opts
 * invoke directly via node command line, or via require()
 * see: https://nodejs.org/api/modules.html#modules_accessing_the_main_module
 *
 * Copyright (c) 2015-2022 Jürgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:server');

var osType = require('os').type();
var exec = require('child_process').exec;
var events = require('events');
var path = require('path');
var u = require('pub-util');
var asyncbuilder = require('asyncbuilder');

if (require.main === module) {
  pubServer().run();
}
else {
  module.exports = pubServer;
}

u.inherits(pubServer, events.EventEmitter);

//--//--//--//--//--//--//--//--//--//--//--//--//

function pubServer(opts) {

  if (!(this instanceof pubServer)) return new pubServer(opts);
  events.EventEmitter.call(this);

  var server = this;

  // pass platform-specific ./node_modules path to resolve-opts for builtin packages
  server.opts = opts = require('pub-resolve-opts')(opts, path.join(__dirname, 'node_modules'));

  opts.production  = opts.production || (process.env.NODE_ENV === 'production');
  opts.port        = opts.port       || process.env.PORT || '3001';
  opts.appUrl      = opts.appUrl     || process.env.APP  || ('http://localhost:' + opts.port);

  server.run       = run;

  var generator = server.generator = require('pub-generator')(opts);

  u.each(opts.serverPlugins.reverse(), function(plugin) {
    debug('server plugin:', plugin.inspect());
    require(plugin.path)(server);
  });

  u.each(opts.generatorPlugins.reverse(), function(plugin) {
    debug('generator plugin:', plugin.path, plugin.inspect());
    require(plugin.path)(generator);
  });

  var log = opts.log;

  //--//--//--//--//--//--//--//--//--//--//--//

  function run() {

    if (opts.outputOnly) {

      // only support single output for now
      var output =  opts.outputs[0];
      if (!output) return log('No output configured.');

      if (output.overrideOpts) {
        log('output only - override opts', output.overrideOpts);
        u.assign(opts, output.overrideOpts);
      }

      generator.load(function(err) {
        if (err) return log(err);
        outputAll(output, function(err) {
          if (err) { log(err); }
          generator.unload();
        });
      });

      return;
    }

    generator.load(function(err) {
      if (err) return log(err);

      if (opts.logPages) {
        generator.logPages();
        generator.unload();
        return;
      }

      require('./server/watch-sources')(generator);
      generator.listen(true);

      if (!opts['no-server']) { expressApp(); }
    });
  }

  function outputAll(output, cb) {

    var ab = asyncbuilder(function(err, a) {
      if (err) return cb(err);
      log('output %s pages, %s scripts, %s statics', a[0].length, a[1].length, a[2].length);

      var filemap = u.flatten(a);
      // check for duplicates assuming case-insensitive output file system
      var dup$ = {};
      u.each(filemap, function(file) {
        if (dup$[file.path.toLowerCase()]) return log('WARNING: duplicate file in output:', file.path);
        dup$[file.path.toLowerCase()] = 1;
      });
      if (output.fileMap) {
        output.src.put( [ { path:'/filemap.json', text:JSON.stringify(filemap,null,2) } ], function(err) {
          if (err) log(err);
        });
      }
      cb();
    });

    var pagesDone = ab.asyncAppend();
    var scriptsDone = ab.asyncAppend();
    var staticsDone = ab.asyncAppend();
    ab.complete();

    generator.outputPages(output, pagesDone);

    require('./server/serve-scripts')(opts).outputAll(output, generator, scriptsDone);

    // wait for static scan to complete before starting output
    var statics = require('./server/serve-statics')(opts, function(){
      statics.outputAll(output, staticsDone);
    });
  }

  function expressApp() {

    server.app =  require('express')();
    server.http = require('http').Server(server.app);
    require('./server/serve-sockets')(server);

    server.app.disable('x-powered-by');

    // see https://expressjs.com/en/guide/behind-proxies.html - boolean type sensitive
    server.app.set('trust proxy', opts['trust proxy'] || false);

    // log(err) shouldn't throw anymore
    log.logger.noErrors = true;

    // sessions come with optional redis logger
    server.sessions = require('pub-serve-sessions')(server);
    log('starting up', opts.appUrl, (opts.production ? 'production' : 'non-production'));

    // other default middleware
    var bodyParser = require('body-parser');
    server.app.use(bodyParser.json());
    server.app.use(bodyParser.urlencoded({ extended: false }));
    server.app.use(require('compression')());

    server.emit('init-app-first');
    if (!(opts.auth && opts.auth.disabled)) {
      server.sessions.authorizeRoutes();
    }

    server.statics = require('./server/serve-statics')(opts).serveRoutes(server);

    if (!opts.staticOnly) {
      server.scripts = require('./server/serve-scripts')(opts).serveRoutes(server);
      require('./server/serve-pages')(server);
    }

    server.emit('init-app-last');

    var limit = 10;
    var tried = 1;
    server.http.on('error', function(err) {
      if (err.code === 'EADDRINUSE' && tried < limit) {
        server.http.close();
        opts.port = (parseInt(opts.port) || 3001) + 1;
        log('port in use, trying', opts.port);
        server.http.listen(opts.port);
        tried ++;
      }
    });

    require('./server/handle-errors')(server);

    server.http.listen(opts.port);
    log('port', opts.port);

    process.on('SIGTERM', function() {
      log('shutting down');
      server.http.close(function() {
        generator.unload();
        server.emit('shutdown');
        process.exit();
      });
    });

    setTimeout(function() {
      if (opts.cli && opts.openBrowser && osType.match(/Darwin/)) {
        exec('open "http://localhost:"' + opts.port);
      }
    }, 100);
  }

}
