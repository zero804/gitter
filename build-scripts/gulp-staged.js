'use strict';

var gulp = require('gulp');
var runSequence = require('run-sequence');

var argv = require('yargs')
  .option('skip-stage', {
    array: true,
    describe: 'skip a stage'
  })
  .help('help')
  .argv;

function shouldSkip(stageName) {
  return argv['skip-stage'] && argv['skip-stage'].indexOf(stageName) >= 0;
}

function findStageTasks(config, stageName) {
  var items = Object.keys(config)
    .map(function(name) {
      return name + ':' + stageName;
    })
    .filter(function(fullName) {
      var hasTask = !!gulp.tasks[fullName];
      return hasTask;
    });

  return items;
}

function configureTasks(config) {

  function createStageTask(stageName, previousStages) {
    if (shouldSkip(stageName)) return;
    if (previousStages) {
      previousStages = previousStages.filter(function(name) {
        return !shouldSkip(name);
      });
    }
    var preTaskName = 'pre-' + stageName;
    var postTaskName = 'post-' + stageName;

    var preSteps = findStageTasks(config, preTaskName);
    var steps = findStageTasks(config, stageName);
    var postSteps = findStageTasks(config, postTaskName);

    if (preSteps.length) {
      gulp.task(preTaskName, preSteps);
    }

    if (postSteps.length) {
      gulp.task(postTaskName, postSteps);
    }

    gulp.task(stageName, previousStages ? previousStages : [], function(callback) {
      var seq = [];
      if (preSteps.length) {
        seq.push(preTaskName);
      }

      if (steps.length) {
        seq.push(steps);
      }

      if (postSteps.length) {
        seq.push(postTaskName);
      }

      if (seq.length === 0) {
        return callback();
      }

      seq.push(callback);

      runSequence.apply(null, seq);
    });
  }

  createStageTask('validate');
  createStageTask('test');
  createStageTask('compile', ['test', 'validate']);
  createStageTask('package', ['compile', 'test']);
  createStageTask('clean');
  createStageTask('watch');

  gulp.task('default', ['package']);
}

module.exports = configureTasks;
