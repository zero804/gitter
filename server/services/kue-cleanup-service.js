/*jslint node: true */
"use strict";

var _ = require('underscore'),
    kue = require('kue'),
    winston = require('winston');

var jobs = kue.createQueue(),
        q = new kue(), // object so we can access exposed methods in the kue lib
        timePastForRemoval = 7, // remove anything older than 7 days
        hours = 24,
        timer = hours * 60 * 60 * 1000; // timer for the setInterval function

function completedJobs(callback) {
  /**
   *  completedJobs - uses the kue lib .complete function to get a list of
   *  all completed job ids, iterates through each id to retrieve the actual
   *  job object, then pushes the object into an array for the callback.
   */
  q.complete(function(err, ids){
    var jobs = [],
    count = 0,
    total = ids.length;
    winston.debug('completedJobs -> ids.length:%s',ids.length);
    _.each(ids, function(id){
      kue.Job.get(id, function(err, job){
        count++;
        jobs.push(job);
        if (total === count) {
          callback(null, jobs);
          return;
        }
      });
    });
  });
}

function removeJobs(jobs, callback) {
  /**
   *  removeJobs - removes the job from kue by calling the job.remove from the
   *  job object collected in completedJobs().
   */
   var count = 0,
   total = jobs.length;
   winston.debug('removeJobs -> jobs.length:%s',jobs.length);
   _.each(jobs, function(job) {
    job.remove(function(err) {
      count++;
      if (total === count) {
        callback(null, count);
        return;
      }
    });
  });
}

function dateDiffInDays(d1, d2) {
  var t2 = d2.getTime(),
  t1 = d1.getTime();
  return parseInt((t2-t1)/(24*3600*1000), 10);
}

function cleanupJob() {

  completedJobs(function(err, jobs) {
    // callback to completedJobs
    winston.debug('completedJobs -> callback-> jobs.length:%s', jobs.length);
    var jobsToRemove = [],
        now = new Date();

    _.each(jobs, function(job){
      var then = new Date(parseInt(job.created_at, 10)),
          diff = dateDiffInDays(then, now);

      if (diff >= timePastForRemoval) {
        jobsToRemove.push(job);
      }
    });

    winston.debug('completedJobs -> callback -> jobsToRemove.length:%s', jobsToRemove.length);
    if (jobsToRemove.length > 0) { // if we have jobsToRemove
      removeJobs(jobsToRemove, function(err, count){
        // callback to removeJobs
        winston.debug('removeJobs -> callback -> jobs removed:%s',count);
      });
    } else {
      winston.debug('completedJobs -> callback -> no jobs to remove');
    }
  });
}

winston.debug('Running kue completed job clean-up');

function promotionJob() {
  jobs.promote();
}

exports.startCleanupJob = function() {
  setInterval(cleanupJob, timer);
  setInterval(promotionJob, 5000);
};
