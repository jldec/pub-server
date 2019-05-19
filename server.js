/*
 * pub server.js
 *
 * launches (express) server after resolving opts
 * invoke directly via node command line, or via require()
 * see: https://nodejs.org/api/modules.html#modules_accessing_the_main_module
 *
 * copyright 2015-2019, Jurgen Leschner - github.com/jldec - MIT license
 */

var debug = require('debug')('pub:server');

var events = require('events');
var path = require('path');
var u = require('pub-util');

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
    generator.load(function(err) {
      if (err) return log(err);

      if (opts.outputOnly) {
        generator.outputPages(function(err, result) {
          if (err) { log(err); }
          log('output %s generated pages', u.flatten(result).length);
        });

        var statics = require('./server/serve-statics')(opts, function(){
          statics.outputAll();
        });
        require('./server/serve-scripts')(opts).outputAll(generator);
        generator.unload();
        return;
      }

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

  function expressApp() {

    server.app =  require('express')();
    server.http = require('http').Server(server.app);
    require('./server/serve-sockets')(server);

    server.app.disable('x-powered-by');

    // see https://expressjs.com/en/guide/behind-proxies.html
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
    server.sessions.authorizeRoutes();

    if (!opts.staticOnly) {
      require('./server/serve-pages')(server);
      server.scripts = require('./server/serve-scripts')(opts).serveRoutes(server);
    }
    server.statics = require('./server/serve-statics')(opts).serveRoutes(server);

    server.emit('init-app-last');

    require('./server/handle-errors')(server);

    server.http.listen(opts.port);
    log('listening on port', opts.port);

    process.on('SIGTERM', function() {
      log('shutting down');
      server.http.close(function() {
        generator.unload();
        server.emit('shutdown');
        process.exit();
      });
    });

  }

}
