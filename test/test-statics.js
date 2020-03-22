/**
 * pub-server test-statics.js
 * copyright 2015-2020, Jürgen Leschner - github.com/jldec - MIT license
 *
**/

/*eslint indent: ["error", 2, { "CallExpression": {"arguments": off} }]*/

var test = require('tape');

var u = require('pub-util');
var EventEmitter = require('events').EventEmitter;

runTest('routes, overwrites, and single-file paths',

  [ { path:__dirname + '/static1' },
    { path:__dirname + '/static2', route:'/', depth:2 },
    { path:__dirname + '/static2', route:'/a/b', depth:2 },
    { path:__dirname + '/static3/favicon.ico' },
    { path:__dirname + '/static4/file5.txt', route:'/extra' } ],

  [ '/extra/file5.txt',
    '/favicon.ico',
    '/a/b/file5.jpg',
    '/a/b/dir3/file4.txt',
    '/file5.jpg',
    '/dir3/file4.txt',
    '/dir1/file1.txt',
    '/dir1/file2.txt',
    '/dir2/file3.txt' ],

  [ '/file5.txt',
    '/favicon.ico',
    '/file5.jpg',
    '/dir3/file4.txt',
    '/file5.jpg',
    '/dir3/file4.txt',
    '/dir1/file1.txt',
    '/dir1/file2.txt',
    '/dir2/file3.txt' ],

  'duplicate static /dir3/file4.txt\n' +
  '  ' + __dirname + '/static2\n' +
  '  ' + __dirname + '/static1\n' );


runTest('index.html',
  [ { path:__dirname + '/static5' } ],
  [ '/index.htm', '/', '/foo.bar', '/a/', '/a/index.x', '/a/bar.foo' ],
  [ '/index.htm',
    '/index.html',
    '/foo.bar',
    '/a/index.html',
    '/a/index.x',
    '/a/bar.foo' ],
  '',
  { indexFiles:['index.html'] }
);

runTest('index.htm',
  [ { path:__dirname + '/static5' } ],
  [ '/',
    '/index.html',
    '/foo.bar',
    '/a/index.html',
    '/a/index.x',
    '/a/bar.foo' ],

  [ '/index.htm',
    '/index.html',
    '/foo.bar',
    '/a/index.html',
    '/a/index.x',
    '/a/bar.foo' ],
  '',
  { indexFiles:['index.htm'] }
);

runTest('index.html, index.htm',
  [ { path:__dirname + '/static5' } ],
  [ '/',
    '/index.html',
    '/foo.bar',
    '/a/',
    '/a/index.x',
    '/a/bar.foo' ],

  [ '/index.htm',
    '/index.html',
    '/foo.bar',
    '/a/index.html',
    '/a/index.x',
    '/a/bar.foo' ],
  '',
  { indexFiles:['index.html', 'index.htm'] }
);

function runTest(name, staticPaths, expectedKeys, expectedFiles, expectedLogText, extraOpts) {
  expectedLogText = expectedLogText || '';
  test(name, function(t) {
    t.timeoutAfter(3000);
    var server = new EventEmitter();
    var actualLogText = '';
    var opts = {
      staticPaths: staticPaths,
      log: function() {
        // console.log.apply(console, arguments);
        actualLogText += u.format.apply(this, arguments) + '\n';
      }
    };
    if (extraOpts) { u.assign(opts, extraOpts); }
    server.app = { use: noop, get: noop };
    require('../server/serve-statics')(opts, function(err, file$) {
      var actualKeys = u.keys(file$);
      var actualFiles = u.pluck(file$, 'file');
      // console.log('keys:', actualKeys);
      // console.log('files:', actualFiles);
      t.deepEqual(actualKeys, expectedKeys);
      t.deepEqual(actualFiles, expectedFiles);
      t.deepEqual(actualLogText, expectedLogText);
      t.end();
    });
  });
}

function noop(){}
