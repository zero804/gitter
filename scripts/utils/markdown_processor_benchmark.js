var Processor = require('gitter-markdown-processor');
var Q = require('q');
var _ = require('underscore');

var qlimit = require('qlimit');

var promisesConcurrency = 10;
var limit = qlimit(promisesConcurrency);

var runs = 100;
var times = [];

// Markdown sample
var sample = "> quote \n\n ```def foo; end``` \n\n @foo hello";


// Tweak this parameters for science
var workersConfig = {
  maxConcurrentWorkers: 2,
  maxConcurrentCallsPerWorker: 10,
  //maxCallsPerWorker: Infinity,
  //maxConcurrentCalls: Infinity
};

console.log(workersConfig);

// Keep the worker around
var p = new Processor({
  workers: workersConfig
});

// Parse promise wrapped with qlimit, the setTimeout is necessary because
// otherwise the timer will start when it's first invoked
var parse = limit(function(markdown) {
  
  var deferred = Q.defer();
 
  setTimeout(function() { 
    var t = new Date();
    p.process(markdown, function (err, result) {
      times.push(new Date() - t);
      err ? deferred.reject(err) : deferred.resolve(result);
    });
  }, 1000);

  return deferred.promise;
});

function log() {
  console.log('runs: ', times.length);

  console.log('max:', _.max(times));
  console.log('min:', _.min(times));

  var sum = _.reduce(times, function(memo, num){ return memo + num; }, 0);
  console.log('avg:', sum / runs);
}

function run() {
  p.process(sample, function() {}); // warmup

  // Generate <runs> amount of promises
  var promises = [];
  for (i = 0; i < runs; i++) {
    promises.push(parse(sample));
  }

  return Q.all(promises)
  .then(function() {
    log();
    p.shutdown();
    process.exit(0);
  })
  .catch(function (err) {
    p.shutdown();
    console.log(err);
    process.exit(1);
  });

}

setTimeout(run, 1000);
