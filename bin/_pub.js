#!/usr/bin/env node

/*
 * pub command script
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
 */

var pkg = require('../package.json');
console.log(pkg.name, 'v'+pkg.version);

// https://github.com/tj/commander.js
var cli = require('commander');

cli.unknownOption = function(opt) {
  process.stdout.write('\n  unknown option: ' + opt + '\n' + cli.helpInformation());
  process.exit(1);
}

// tweak usage not to include the first line with the incorrect command name
cli.helpInformation = function() { return '\n' +
  'usage: pub [opts] [dir]\n' +
  'opts:\n' +
  cli.optionHelp().replace(/^/gm, '  ') + '\n\n';
}

var u = require('pub-util');

cli
  .option('-p, --port <port>',       'server port [3001]')
  .option('-t, --theme <name>',      'theme module-name or dir, repeatable', collect, [])
  .option('-o, --output-path <dir>', 'output dir [.]')
  .option('-O, --output-only',       'output html with static files and exit')
  .option('-s, --static <dir>',      'static dir, repeatable, supports <dir>,<route>', collectStaticPaths, [])
  .option('-S, --static-only',       'serve only static files from current dir')
  .option('-m, --md-fragments',      'use markdown headers as fragments')
  .option('-C, --config',            'show config and exit')
  .option('-I, --ignore-config',     'ignore pub-config file')
  .option('-P, --pages',             'show pages and templates and exit')
  .option('-W, --no-watch',          'don\'t watch for changes')
  .option('-K, --no-sockets',        'no websockets')
  .option('-E, --no-editor',         'website only, no editor')
  .option('-d, --dbg',               'enable scriptmaps and client-side debug traces')
  .option('-D, --debug',             'node --debug (server and client-side)')
  .option('-B, --debug-brk',         'node --debug-brk (server and client-side)');

cli.parse(process.argv);

var opts = {};

opts.cli = true;
opts.dir = cli.args[0] || '.';

if (cli.port)                      { opts.port = cli.port; }
if (cli.theme.length)              { opts.themes = cli.theme; }
if (cli.static.length)             { opts.staticPaths = cli.static; }
if (cli.outputPath)                { opts.outputs = cli.outputPath; }
if (cli.mdFragments)               { opts.fragmentDelim = 'md-headings'; }
if (cli.outputOnly)                { opts.outputOnly = true; }
if (cli.staticOnly)                { opts.staticOnly = true; }
if (cli.ignoreConfig)              { opts.ignoreConfig = true; }
if (cli.pages)                     { opts.logPages = true; }
if (!cli.watch || cli.outputOnly)  { opts['no-watch'] = true; }
if (!cli.sockets)                  { opts['no-sockets'] = true; }
if (cli.editor && !cli.outputOnly && !cli.staticOnly) { opts.editor = true; }
if (cli.dbg)                       { opts.dbg = process.env.DEBUG || '*'; opts['no-timeouts'] = true; }

var server = require('../server')(opts);

if (cli.config) return console.log(u.inspect(u.omit(opts, 'source$', 'output$'), {depth:2, colors:true}));

server.run();

//--//--//--//--//--//--//--//--//

function collect(val, arr) {
  arr.push(val);
  return arr;
}

function collectStaticPaths(val, arr) {
  var pair = val.split(',');

  if (pair.length > 1) {
    arr.push( { path: pair[0], route: pair[1], depth: 10 } );
  }
  else {
    arr.push( { path: pair[0], depth: 10 } );
  }

  return arr;
}
