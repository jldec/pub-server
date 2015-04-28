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

test("routes, overwrites, and single-file paths", function(done) {
  this.timeout(3000);

  var server = new EventEmitter();

  var actualLogText = '';

  server.opts = {
    staticPaths: [
      { path:__dirname + '/static1' },
      { path:__dirname + '/static2', route:'/' },
      { path:__dirname + '/static2', route:'/a/b' },
      { path:__dirname + '/static3/favicon.ico' },
      { path:__dirname + '/static4/file5.txt', route:'/extra' }
    ],
    log: function() {
      console.log.apply(console, arguments);
      actualLogText += u.format.apply(this, arguments) + '\n';
    }
  };

  server.app = { use: noop, get: noop };

  var statics = require('../serve-statics')(server);

  var expected =
  [ '/extra/file5.txt',
    '/favicon.ico',
    '/a/b/dir3/file4.txt',
    '/a/b/file5.jpg',
    '/dir3/file4.txt',
    '/file5.jpg',
    '/dir1/file1.txt',
    '/dir1/file2.txt',
    '/dir2/file3.txt' ];

  var expectedLogText =
    'overwriting duplicate static /dir3/file4.txt\n' +
    '  old path: /Users/hello/pub/server/test/static2\n' +
    '  new path: /Users/hello/pub/server/test/static1\n';

  server.on('static-scan', function() {
    var actual = u.keys(statics.file$);
  console.log(actual);
    assertNoDiff(actual, expected);
    assertNoDiff(actualLogText, expectedLogText);
    done();
  });

});

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
