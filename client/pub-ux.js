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

  var style =
  { 'position':'fixed',
    'z-index':'200',
    'opacity':'0.5',
    'font-family': '"Helvetica Neue",Tahoma,Arial,sans-serif',
    'font-weight': '400',
    'font-size': '18px',
    'line-height': '20px',
    'height':'21px',
    'top':'0',
    'right':'0',
    'background-color':'#555',
    'color':'#fff',
    'border-bottom-left-radius':'10px',
    'text-align':'right',
    'padding':'0 2px 0 5px',
    'cursor':'pointer' };

  var $b, relPath, contentHref, editorHref;

  // TODO: fix this logic to support 'normal' urls ending in /pub/
  if (window.parent.location.pathname.match(/\/pub\/$/)) {
    $.pubEditor = true;
    $b = $('<div class="pub-button" title="Close editor">Close</div>').css(style);
    $('body').prepend($b);
    $b.on('click', function(){
      contentHref = location.pathname + location.search + location.hash;
      relPath = window.generator && window.generator.opts.relPath;
      if (relPath && contentHref.slice(0, relPath.length) !== relPath) {
        contentHref = relPath + contentHref;
      }
      window.parent.location = contentHref;
    });
  }
  else {
    $.pubEditor = false;
    // page param used in pub-preview.js to open editor on the proper page
    $b = $('<div class="pub-button" title="Edit">Edit</div>').css(style);
    $('body').prepend($b);
    $b.on('click', function(){
      contentHref = location.pathname + location.search + location.hash;
      relPath = window.relPath || '.';
      editorHref = relPath + '/pub/?page=' + encodeURIComponent(contentHref);
      location = editorHref;
    });
  }

});
