#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";


var kue = require('../server/utils/kue');
var q = new kue();
var Q = require('q');

function getActive(callback) {

  q.active(function(err, ids){
    var promises = ids.map(function(id) {
      var d = Q.defer();
      kue.Job.get(id, d.makeNodeResolver());
      return d.promise;
    });
    Q.all(promises)
      .then(function(results) {
        return callback(null, results);
      })
      .fail(callback);
  });
}


var opts = require("nomnom")
   .option('type', {
      abbr: 't',
      list: false,
      required: true,
      help: 'Type of job to delete'
   })
   .option('age', {
      abbr: 'a',
      required: true,
      help: 'Age of job in hours'
   })
   .parse();


getActive(function(err, jobs) {
  if(err) { console.error(err); process.exit(1); }

  var promises = [];
  jobs.forEach(function(job) {
    if(job.type === opts.type) {
      var age = (Date.now() - job.created_at) / 60 * 60 * 1000;
      if(age > opts.age) {
        console.log(job.data.title);

        var d = Q.defer();
        job.remove(d.makeNodeResolver());
        promises.push(d.promise);
      }
    }
  });


  Q.all(promises)
    .then(function() {
      process.exit(0);
    })
    .fail(function(err) {
      console.error(err);
      process.exit(1);
    });
});

