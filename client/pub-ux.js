/*
 * pub-ux.js
 * browserify entry point
 * connect/disconnect socket.io and inject pub UI into dom
 *
 * copyright 2015, Jurgen Leschner - github.com/jldec - MIT license
*/

var debug = require('debug')('pub:ux');

if (window.io) {

  debug('socket:connect');
  var socket = io();

  socket.on('reload', function() {
    // in-browser generator case, just notify
    if (window.generator) {
      return window.generator.emit('notify', 'save');
    }
    debug('socket:reload');
    location.reload();
  });

  $(window).on('beforeunload', function() {
    debug('socket:disconnect');
    socket.disconnect();
  })

}

$(function(){

  var prefix = '/pub';
  var $b;

  var style =
  { 'position':'fixed',
    'z-index':'200',
    'opacity':'0.5',
    'font-family': '"Helvetica Neue",Tahoma,Arial,sans-serif',
    'font-size': '0.82em',
    'line-height': '1.3',
    // 'width':'1.4em',
    'height':'1.4em',
    'top':'0',
    'right':'0',
    'background-color':'#555',
    'color':'#fff',
    'border-bottom-left-radius':'10px',
    'text-align':'right',
    'padding':'0 4px',
    'cursor':'pointer' };

  if (window.parent.location.href.match(new RegExp('.*?//[^/]*' + prefix + '/'))) {
    $.pubEditor = true;
    $b = $('<div class="pub-button" title="Close editor">Close</div>').css(style);
    $('body').prepend($b);
    $b.on('click', function(){ window.parent.location = location.href; });
  }
  else {
    $.pubEditor = false;
    $b = $('<div class="pub-button" title="Edit">Edit</div>').css(style);
    $('body').prepend($b);
    $b.on('click', function(){
      var lmatch = location.href.match(/(.*?\/\/[^\/]*)(\/[^\/]*)(.*)/);
      location = lmatch[1] + prefix + lmatch[2] + lmatch[3];
    });
  }

});
