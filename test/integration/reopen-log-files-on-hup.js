/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('./test-require');
var assert = require("assert");


// This test spawns itself, when it does this is what it runs
if(process.argv[2] == 'log') {
  var w = testRequire("./utils/winston");

  setTimeout(function() {
    process.exit();
  }, 60000);

  var t = w['default'].transports.file;

  setTimeout(function() {
    t.once('flush', function() {
      console.log('READY TO GO');
    });
    t.flush();
  }, 200);

  setInterval(function() {
    w.error("Hello: " + Date.now());
  }, 50);

  return;
}


var fs = require('fs');
var spawn = require('child_process').spawn;

describe('winston', function() {
  it('should reobtain log file handles post HUP signal', function(done) {
      var logFile = '/tmp/reopen-log-files-on-hup-child.' + Date.now() + '.log';

      if(fs.existsSync(logFile)) fs.unlinkSync(logFile);

      var child = spawn('node', [ __filename, 'log', '--logging:logToFile=true', '--LOG_FILE=' + logFile, '--logging:level=silly']);

      var exitOk = false;

      child.on('exit', function(code, signal) {
        if(exitOk) return;
        done('Child process killed with code: ' + code + ', signal:' + signal);
      });

      child.on('error', function(err) {
        done(err);
      });


      child.on('close', function(code) {
        if(exitOk) return;
        done('Child process killed with code: ' + code);
      });


      child.stderr.on('data', function (data) {
        console.error('stderr: ' + data);
      });

      var count = 0;

      child.stdout.on('data', function (data) {
        data = "" + data;

        if(data.indexOf('READY TO GO') >= 0) {
          assert(fs.existsSync(logFile), 'The log file `' + logFile + '` should exist as child process has started');
          fs.unlinkSync(logFile);
          assert(!fs.existsSync(logFile), 'The log file `' + logFile + '` should not exist');

          child.kill('SIGHUP');
          return;
        }

        if(data.indexOf('Log rotation completed') >= 0) {
          exitOk = true;
          child.kill();

          assert(fs.existsSync(logFile), 'The log file `' + logFile + '` should exist');
          fs.unlinkSync(logFile);

          done();
        }
      });

  });
});
