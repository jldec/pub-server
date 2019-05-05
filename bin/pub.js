#!/usr/bin/env node

/**
 * this code credit: TJ et al (https://github.com/mochajs/mocha framework)
 * This tiny wrapper file checks for known node flags and appends them
 * when found, before invoking the "real" executable.
 */

var spawn = require('child_process').spawn
  , args = [ __dirname + '/_pub' ];


process.argv.slice(2).forEach(function(arg){
  var flag = arg.split('=')[0];

  switch (flag) {
  case '-?':
  case '-H':
    args.push('-h');
    break;
  case '-D':
    args.unshift('--inspect');
    args.push('--dbg');
    break;
  case '-B':
    args.unshift('--inspect');
    args.unshift('--debug-brk');
    args.push('--dbg');
    break;
  default:
    args.push(arg);
    break;
  }
});

var proc = spawn(process.argv[0], args, { stdio: 'inherit' });
proc.on('exit', function(code, signal) {
  process.on('exit', function(){
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code);
    }
  });
});

// terminate children.
process.on('SIGINT', function() {
  proc.kill('SIGINT'); // calls runner.abort()
  proc.kill('SIGTERM'); // if that didn't work, we're probably in an infinite loop, so make it die.
  process.kill(process.pid, 'SIGINT');
});
