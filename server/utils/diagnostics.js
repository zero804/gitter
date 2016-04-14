"use strict";

var env     = require('gitter-web-env');
var winston = env.logger;
var nconf   = env.config;
var path    = require('path');
var util    = require('util');
var os      = require('os');

if (nconf.get('newrelic:enabled')) require('newrelic');

function getProcessIdentifier() {
  var upstartJob = process.env.UPSTART_JOB || process.env.JOB;
  if (upstartJob) return upstartJob;

  var main = require.main;
  if (!main || !main.filename) return 'unknown';

  return path.basename(main.filename, '.js');
}

function getDateIdentifier() {
  function pad(d) {
    if (d < 10) return "0" + d;
    return "" + d;
  }

  var d = new Date();
  return util.format('%s-%s-%s-%s%s%s',
    d.getUTCFullYear(),
    pad(d.getUTCMonth() + 1),
    pad(d.getUTCDate()),
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes()),
    pad(d.getUTCSeconds()));
}

/* Heapdump and nodemon don't play nicely together */
if(!process.env.NODEMON) {

  /* Heapdump is now always on */
  process.env.NODE_HEAPDUMP_OPTIONS = 'nosignal';
  var heapdump = require('heapdump');

  process.on('SIGUSR2', function() {
    var identifier = getProcessIdentifier();

    var filename = util.format('heap.%s.%s.%s.%s.heapsnapshot',
      os.hostname(),
      identifier,
      process.pid,
      getDateIdentifier());

    filename = path.resolve('.', filename);

    winston.warn('Writing heapsnapshot: ' + filename);
    heapdump.writeSnapshot(filename, function(err, filename) {
      if (err) {
        winston.warn('Unable to write heapsnapshot: ', { exception: err });
        return;
      }

      winston.warn('Wrote heapsnapshot: ', { filename: filename });
    });
  });
}

if(nconf.get('diagnostics:heapdump')) {
  var memwatch = require('memwatch-next');
  memwatch.on('leak', function(info) {
    winston.warn('memwatch: leak: ' + info.reason);
  });

  memwatch.on('stats', function(stats) {
    if(stats && stats.usage_trend) {
      winston.info('memwatch: stats: ', stats);
    }
  });
}
