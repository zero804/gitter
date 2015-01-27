/* jshint node:true, unused:true */
'use strict';

var moment = require('moment');
var _ = require('lodash');
var mongodb = require('mongodb');
var assert = require('assert');
var Db = mongodb.Db;
var Server = mongodb.Server;

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

moment.createFromInputFallback = function() {
  throw new Error('Deprecated');
};

function makeDate(year, dayOfYear) {
  return moment({ year :year }).add(dayOfYear - 1, 'day').toDate();
}

function getStartOfWeek(momentDate) {
  var currentDay = momentDate.day();
  if (currentDay === 1 /* MONDAY */) return momentDate;

  var daysToSubtract = (currentDay === 0) ? /* SUNDAY */ 6 : currentDay - 1;

  var precedingMonday = moment(momentDate.valueOf()).subtract(daysToSubtract, 'days');

  /* Sanity checks */
  assert(precedingMonday.day() === 1, 'Should be monday');
  assert(moment.duration(momentDate.diff(precedingMonday)).asDays() <= 6, 'More than a week difference');

  return precedingMonday;
}

function RetentionAnalyser(db, options) {
  this.db = db;
  this.options = options || {};
}

RetentionAnalyser.prototype.categoriseUsers = function(allCohortUsers, callback) {
  var self = this;

  var orTerms = _(allCohortUsers)
    .transform(function(result, userIds, timestamp) {
      var start = new Date(parseInt(timestamp, 10));
      var endOfClassificationPeriod = moment(start).add(14, 'days').toDate(); // 2 week classification

      result.push({
        'd.userId': { $in: userIds },
        t: { $gte: start,  $lt: endOfClassificationPeriod }
      });

    }, [])
    .value();

  var joinRoomEvents = this.db.collection("gitter_join_room_events");
  joinRoomEvents.aggregate([
    { $match: {
        $or: orTerms
      }
    },{
      $group: { _id: "$d.userId", total: { $sum: 1 } }
    }
    ], function(err, result) {
      if(err) return callback(err);

      var indexed = result.reduce(function(memo, r) {
        memo[r._id] = r.total;
        return memo;
      }, {});

      var categorised = _(allCohortUsers)
        .values()
        .flatten()
        .uniq()
        .transform(function(memo, userId) {
          memo[userId] = self.bucketFor(indexed[userId] || 0);
          return memo;
        }, {})
        .value();

      callback(null, categorised);
    });
};


RetentionAnalyser.prototype.getLoginDataPerDay = function (allCohortUsers, callback) {
  var self = this;
  var userLoginEvents = this.db.collection("gitter_user_login_events");

  var orTerms = _(allCohortUsers)
    .transform(function(result, userIds, timestamp) {
      var ts = parseInt(timestamp, 10);
      var start = new Date(ts);
      var term = {
        'd.userId': { $in: userIds },
        t: { $gte: start }
      };

      var limit = self.options.limit;
      if (limit) {
        var limitOfUsage = moment(start).add(limit.amount, limit.unit).toDate();

        term.t.$lt = limitOfUsage;
      }

      result.push(term);
    }, [])
    .value();

  userLoginEvents.aggregate([
      {
        $match: {
          $or: orTerms
        },
      },
      {
        $project: {
          userId: '$d.userId',
          period: { year: { $year: "$t" }, dayOfYear: { $dayOfYear: "$t" } }
        }
      },
      {
         $group:
           {
             _id: "$period",
             userIds: { $addToSet: "$userId" }
           }
       }
    ],
    function(err, periodData) {
      if (err) return callback(err);

      assert(periodData.length > 0, 'No activity found');

      periodData.sort(function(a, b) {
        var dA = makeDate(a._id.year, a._id.dayOfYear).valueOf();
        var dB = makeDate(b._id.year, b._id.dayOfYear).valueOf();
        if(dA < dB) return -1;
        if(dA > dB) return +1;
        return +0;
      });

      var r = periodData.reduce(function(memo, f) {
        var ts = makeDate(f._id.year, f._id.dayOfYear).valueOf();
        memo[ts] = f.userIds;
        return memo;
      }, {});

      callback(null, r);
    });
};

RetentionAnalyser.prototype.rollupUsageIntoWeeks = function(input) {
  var uniqueUserCountBefore = _(input).values().uniq().size();

  var weekly = _(input)
    .transform(function(result, userIds, timestamp) {
      var cohortDate  = getStartOfWeek(moment(parseInt(timestamp, 10)));

      timestamp = cohortDate.valueOf();

      if (result[timestamp]) {
        result[timestamp] = result[timestamp].concat(userIds);
      } else {
        result[timestamp] = userIds;
      }
    })
    .transform(function(result, userIds, timestamp) {
      result[timestamp] = _.uniq(userIds);
    })
    .value();

  var uniqueUserCountAfterwards = _(input).values().uniq().size();

  /* Sanity check */
  assert(uniqueUserCountBefore === uniqueUserCountAfterwards, 'Expected the number of users before and after the rollup to be the same (before: ' + uniqueUserCountBefore + ', after: ', uniqueUserCountAfterwards + ')');
  return weekly;
};

RetentionAnalyser.prototype.getUserInteractionsByDay = function (allCohortUsers, callback) {
  var self = this;

  this.getLoginDataPerDay(allCohortUsers, function(err, loginResults) {
    if(err) return callback(err);

    if (self.options.daily) {
      return callback(null, loginResults);
    }

    // Roll into weeks
    var weeklyUsage = self.rollupUsageIntoWeeks(loginResults);
    return callback(null, weeklyUsage);
  });
};

RetentionAnalyser.prototype.getCohortUsersGrouped = function(start, end, callback) {
  var self = this;
  var newUserEvents = this.db.collection("gitter_new_user_events");

  newUserEvents.aggregate([
      {
        $match: {
          t: { $gte: start, $lt: end }
        },
      },
      {
        $project: {
          userId: '$d.userId',
          period: { year: { $year: "$t" }, dayOfYear: { $dayOfYear: "$t" } }
        }
      },
      {
         $group:
           {
             _id: "$period",
             userIds: { $addToSet: "$userId" }
           }
       }
    ],
    function(err, periodData) {
      if (err) return callback(err);

      var newUsersByDay = _(periodData)
        .transform(function(result, dailyNewUsers) {
          var cohortDate = moment(makeDate(dailyNewUsers._id.year, dailyNewUsers._id.dayOfYear));

          // Turn days into weeks...
          if(!self.options.daily) {
            cohortDate = getStartOfWeek(cohortDate);
          }

          var ts = cohortDate.valueOf();
          if(result[ts]) {
            result[ts] = result[ts].concat(dailyNewUsers.userIds);
          } else {
            result[ts] = dailyNewUsers.userIds;
          }

        },{})
        .transform(function(result, userIds, timestamp) {
          result[timestamp] = _.uniq(userIds); // Probably not needed
        })
        .value();

      callback(null, newUsersByDay);
    });
};

RetentionAnalyser.prototype.bucketFor = function(category) {
  if(category === 0) return "0";
  if(category < 10) return "0" + category;
  return "10 or more";
};

RetentionAnalyser.prototype.buildCohortRetention = function(cohortTimestamp, cohortUserIds, dailyInteractingUsers, categorisedUsers) {
  var cohortUsersIndexed = _(cohortUserIds)
    .transform(function(result, userId) {
      result[userId] = true;
    }, {})
    .value();

  var cohortDailyInteractingUsers = _(dailyInteractingUsers)
    .transform(function(result, userIds, timestamp) {
      var filteredUserIds = userIds.filter(function(userId) { return cohortUsersIndexed[userId]; });

      if (filteredUserIds.length) {
        var byCategory = _(filteredUserIds)
          .transform(function(memo, userId) {
            var category = categorisedUsers[userId];

            if(memo[category]) {
              memo[category]++;
            } else {
              memo[category] = 1;
            }
          }, {
            total: filteredUserIds.length
          })
          .value();

        result[timestamp] = byCategory;
      }
    })
    .value();

  // Count how many users are in each category
  var categoryCounts = _(cohortUserIds)
    .transform(function(result, userId) {
      var category = categorisedUsers[userId];
      if(result[category]) {
        result[category]++;
      } else {
        result[category] = 1;
      }
    })
    .value();

  var allCategories = _(categoryCounts).keys().sort().value();

  var subcohorts = _(allCategories)
    .transform(function(result, category) {
      result[category] = { total: categoryCounts[category] };
    }, {})
    .value();

  var totals = _(cohortDailyInteractingUsers)
    .keys()
    .sort()
    .transform(function(totals, time) {
      var interactions = cohortDailyInteractingUsers[time];

      var relativeDate = moment.duration(moment(parseInt(time, 10)).diff(parseInt(cohortTimestamp, 10))).asDays();

      totals[relativeDate] = interactions.total;

      allCategories.forEach(function(category) {
        var subcohort = subcohorts[category];
        var value = interactions[category] || 0;
        subcohort[relativeDate] = value;   // NB: side effect!
      });

    }, {
      total: cohortUserIds.length
    })
    .value();

  return {
    cohortTimestamp: moment(parseInt(cohortTimestamp, 10)).toDate(),
    cohortUsersCount: cohortUserIds.length,
    totals: totals,
    subcohorts: subcohorts
  };
};


RetentionAnalyser.prototype.buildRetention = function(start, end, callback) {
  var self = this;

  debug('Finding cohort users');


  this.getCohortUsersGrouped(start, end, function(err, allCohortUsers) {
    if (err) return callback(err);

    /* Sanity check uniqueness of users */
    var userIds = _(allCohortUsers).values().flatten();
    assert(userIds.size() === userIds.uniq().size(), 'Duplicate users found in cohorts');

    var allCohortUsersCount = userIds.size();

    debug('Categorising cohort users');

    self.categoriseUsers(allCohortUsers, function(err, categorisedUsers) {
      if (err) return callback(err);

      /* Sanity checks for the categorisations */
      var categorisedUserCount = _(categorisedUsers).keys().size();
      assert(categorisedUserCount === allCohortUsersCount, 'Categorised user count does not match all users');

      debug('Getting user activity');

      /* Proceed with the interactions */
      self.getUserInteractionsByDay(allCohortUsers, function(err, dailyInteractingUsers) {
        if (err) return callback(err);

        debug('Crunching the numbers');

        /* Some more sanity checks */
        var limit = self.options.limit;
        var limitOfUsage;
        if (limit) {
          limitOfUsage = moment(end).add(limit.amount, limit.unit).valueOf();
        }

        Object.keys(dailyInteractingUsers)
          .forEach(function(timestamp) {
            var ts = parseInt(timestamp, 10);
            assert(ts >= start.valueOf(), 'Activity before start');

            if (limitOfUsage) {
              assert(ts < limitOfUsage, 'Activity after end');
            }
          });

        /* Proceed with building the retention objects */
        var result = _(allCohortUsers)
          .keys()
          .sort()
          .map(function(cohortTimestamp) {
            var cohortUserIds = allCohortUsers[cohortTimestamp];
            return self.buildCohortRetention(cohortTimestamp, cohortUserIds, dailyInteractingUsers, categorisedUsers);
          })
          .value();

        callback(null, result);
      });

    });

  });
};

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

    Object.keys(cohort.subcohorts).forEach(function(subcohortKey) {
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

    var analyser = new RetentionAnalyser(cubeDb, { daily: opts.daily, limit: limit });

    var start, end;
    if (opts.start) {
      start = moment(opts.start).startOf('day').toDate();
    } else {
      start = getStartOfWeek(moment().startOf('day')).subtract(opts.count, opts.unit).toDate();
    }

    if (opts.end) {
      end = moment(opts.end).startOf('day').toDate();
    } else {
      end = getStartOfWeek(moment().startOf('day')).toDate();
    }


    debug('Dates', start.toISOString(), end.toISOString());

    analyser.buildRetention(start, end, function(err, results) {
      if (err) return die(err);

      printCSV(results, opts.percent);
      process.exit(0);
    });

  });
