/* jshint node:true, unused:true */
'use strict';

var moment = require('moment');
var mongodb = require('mongodb');
var Db = mongodb.Db;
var Server = mongodb.Server;
var utils = require('./cohort-utils');
var _ = require('lodash');

function die(err) {
  console.error('ERROR');
  console.error(err);
  console.error(err.stack);
  process.exit(1);
}

var opts = require("nomnom")
  .option('daily', {
    abbr: 'd',
    flag: true,
    required: false,
    help: 'Perform daily analysis',
    default: false
  })
  .option('verbose', {
    abbr: 'v',
    flag: true,
    required: false,
    help: 'Verbose',
    default: false
  })
  .option('start', {
    abbr: 's',
    required: false,
    help: 'Start date',
    transform: function(timestamp) {
      return new Date(timestamp);
    }
  })
  .option('moduleName', {
    abbr: 'm',
    required: false,
    default: 'user-rooms',
    help: 'Analysis module'
  })
  .option('end', {
    abbr: 'e',
    required: false,
    help: 'End date',
    transform: function(timestamp) {
      return new Date(timestamp);
    }
  })
  .option('count', {
    abbr: 'e',
    required: false,
    help: 'Number of cohorts',
    default: 8,
    transform: function(num) {
      return parseInt(num, 10);
    }
  })
  .option('limit', {
    abbr: 'l',
    required: false,
    help: 'Limit',
    transform: function(limit) {
      return parseInt(limit, 10);
    }
  })
  .option('unit', {
    abbr: 'u',
    default: 'weeks',
    choices: ['days', 'weeks', 'day', 'week'],
    required: false,
    help: 'Unit for limit'
  })
  .option('percent', {
    abbr: 'p',
    flag: true,
    required: false,
    default: false,
    help: 'Output values as percentages'
  })
  .parse();

function debug() {
  if (!opts.verbose) return;
  console.error.apply(console, arguments);
}


function printCSV(results, asPercent) {

  function showValue(value, total) {
    if (!total) return '';
    if (!value) value = 0;
    if(asPercent) {
      return (value / total * 100).toFixed(2);
    }

    return value;
  }

  results.forEach(function(cohort) {
    var cohortIntervalDates = Object.keys(cohort.totals).filter(function(f) { return f !== 'total'; });
    var headerRow = [moment(cohort.cohortTimestamp).format('YYYY-MM-DD'), ''].concat(cohortIntervalDates.map(function(f) {
      return "+" + f;
    }));

    var totalRow = ['Total', cohort.totals.total].concat(cohortIntervalDates.map(function(cohortIntervalDate) {
      var value = cohort.totals[cohortIntervalDate];
      return showValue(value, cohort.totals.total);
    }));

    console.log(headerRow.join(','));
    console.log(totalRow.join(','));

    var subCohortsSorted = _(cohort.subcohorts)
      .keys()
      .value();

    subCohortsSorted.sort(function(a, b) {
      return cohort.subcohorts[b].total - cohort.subcohorts[a].total;
    });

    subCohortsSorted.forEach(function(subcohortKey) {
      var subcohort = cohort.subcohorts[subcohortKey];
      var subcohortSize = subcohort.total;

      var subcohortRow = [subcohortKey,  showValue(subcohortSize, cohort.totals.total)].concat(cohortIntervalDates.map(function(cohortIntervalDate) {
        var value = subcohort[cohortIntervalDate];
        return showValue(value, subcohortSize);
      }));

      console.log(subcohortRow.join(','));
    });

  });
}


// Establish connection to db
debug('Opening connection');
new Db('cube', new Server('mongo-replica-member-001', 27017), { safe: false, slaveOk: true })
  .open(function(err, cubeDb) {
    if (err) die(err);

    var limit;
    if(opts.limit) {
      limit = { amount: opts.limit, unit: opts.unit };
    }

    var Module = require('./' + opts.moduleName + '-cohort-analyser');

    var analyser = new Module(cubeDb, { daily: opts.daily, limit: limit, debug: debug });

    var start, end;
    if (opts.start) {
      start = moment(opts.start).startOf('day').toDate();
    } else {
      start = utils.getStartOfWeek(moment().startOf('day')).subtract(opts.count, opts.unit).toDate();
    }

    if (opts.end) {
      end = moment(opts.end).startOf('day').toDate();
    } else {
      end = utils.getStartOfWeek(moment().startOf('day')).toDate();
    }

    analyser.buildRetention(start, end, function(err, results) {
      if (err) return die(err);

      printCSV(results, opts.percent);
      process.exit(0);
    });

  });
