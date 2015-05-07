/**
 * pub-server test-statics.js
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
 *
**/

suite('pub-server test-statics');

var should = require('should');
var assert = require('assert');
var deepdiff = require('deep-diff');
var u = require('pub-util');
var EventEmitter = require('events').EventEmitter;

runTest("routes, overwrites, and single-file paths",

  [ { path:__dirname + '/static1' },
    { path:__dirname + '/static2', route:'/', depth:2 },
    { path:__dirname + '/static2', route:'/a/b', depth:2 },
    { path:__dirname + '/static3/favicon.ico' },
    { path:__dirname + '/static4/file5.txt', route:'/extra' } ],

  [ '/extra/file5.txt',
    '/favicon.ico',
    '/a/b/dir3/file4.txt',
    '/a/b/file5.jpg',
    '/dir3/file4.txt',
    '/file5.jpg',
    '/dir1/file1.txt',
    '/dir1/file2.txt',
    '/dir2/file3.txt' ],

  [ '/file5.txt',
    '/favicon.ico',
    '/dir3/file4.txt',
    '/file5.jpg',
    '/dir3/file4.txt',
    '/file5.jpg',
    '/dir1/file1.txt',
    '/dir1/file2.txt',
    '/dir2/file3.txt' ],

  'duplicate static /dir3/file4.txt\n' +
  '  ' + __dirname + '/static2\n' +
  '  ' + __dirname + '/static1\n' );


runTest("index.html",
  [ { path:__dirname + '/static5' } ],
  [ '/a/bar.foo', '/a/', '/a/index.x', '/foo.bar', '/index.htm', '/' ],
  [ '/a/bar.foo',
    '/a/index.html',
    '/a/index.x',
    '/foo.bar',
    '/index.htm',
    '/index.html' ],
  '',
  { indexFiles:['index.html'] }
);

runTest("index.htm",
  [ { path:__dirname + '/static5' } ],
  [ '/a/bar.foo', '/a/index.html', '/a/index.x', '/foo.bar', '/', '/index.html' ],
  [ '/a/bar.foo',
    '/a/index.html',
    '/a/index.x',
    '/foo.bar',
    '/index.htm',
    '/index.html' ],
  '',
  { indexFiles:['index.htm'] }
);

runTest("index.html, index.htm",
  [ { path:__dirname + '/static5' } ],
  [ '/a/bar.foo', '/a/', '/a/index.x', '/foo.bar', '/', '/index.html' ],
  [ '/a/bar.foo',
    '/a/index.html',
    '/a/index.x',
    '/foo.bar',
    '/index.htm',
    '/index.html' ],
  '',
  { indexFiles:['index.html', 'index.htm'] }
);

function runTest(name, staticPaths, expectedKeys, expectedFiles, expectedLogText, extraOpts) {
  expectedLogText = expectedLogText || ''
  test(name, function(done) {
    this.timeout(3000);
    var server = new EventEmitter();
    var actualLogText = '';
    var opts = {
      staticPaths: staticPaths,
      log: function() {
        console.log.apply(console, arguments);
        actualLogText += u.format.apply(this, arguments) + '\n';
      }
    };
    if (extraOpts) { opts = u.extend(opts, extraOpts); }
    server.app = { use: noop, get: noop };
    var statics = require('../server/serve-statics')(opts, server);
    server.on('static-scan', function() {
      var actualKeys = u.keys(statics.file$);
      var actualFiles = u.pluck(statics.file$, 'file');
// console.log('keys:', actualKeys);
// console.log('files:', actualFiles);
      assertNoDiff(actualKeys, expectedKeys);
      assertNoDiff(actualFiles, expectedFiles);
      assertNoDiff(actualLogText, expectedLogText);
      done();
    });
  });
}

function assertNoDiff(actual, expected, msg) {
  var diff = deepdiff(actual, expected);
  var maxdiff = 5;
  if (diff) {
    assert(false, 'deepDiff ' + (msg || '') + '\n'
      + u.inspect(diff.slice(0,maxdiff), {depth:3})
      + (diff.length > maxdiff ? '\n...(truncated)' : ''));
  }
}

function noop(){}
