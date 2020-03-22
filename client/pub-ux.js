/*
 * pub-ux.js
 * browserify entry point for legacy pub-pkg-editor
 *
 * copyright 2015-2020, Jürgen Leschner - github.com/jldec - MIT license
*/

/* global $ */

$(function(){

  var style =
  { 'position':'fixed',
    'z-index':'9999999',
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

  var $b;

  if (window.parent.location.pathname.match(/\/pub\/$/)) {
    $.pubEditor = true;
    $b = $('<div class="pub-button" title="Close editor">Close</div>').css(style);
    $('body').prepend($b);
    $b.on('click', function(){
      var contentHref = location.pathname + location.search + location.hash;
      var staticRoot = window.generator && window.generator.opts.staticRoot;
      if (staticRoot && contentHref.slice(0, staticRoot.length) !== staticRoot) {
        contentHref = staticRoot + contentHref;
      }
      window.parent.location = contentHref;
    });
  }
  else {
    $.pubEditor = false;
    // logic supports static at root or not, or pub-server /pub/ editor
    // page param used in pub-preview.js to open editor on the proper page
    $b = $('<div class="pub-button" title="Edit">Edit</div>').css(style);
    $('body').prepend($b);
    $b.on('click', function(){
      var pubRef = window.pubRef || {};
      var contentHref = (pubRef.href || location.pathname) + location.search + location.hash;
      var editorHref = (pubRef.relPath || '') + '/pub/?page=' + encodeURIComponent(contentHref);
      location = editorHref;
    });
  }

});
