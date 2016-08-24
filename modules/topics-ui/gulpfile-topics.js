/* eslint-disable node/no-unpublished-require */
'use strict';

var gulp = require('gulp');
var del = require('del');
var path = require('path');
var webpackPipeline = require('./dev/gulp-tasks-webpack');
var babelPipeline = require('./dev/gulp-tasks-babel');
var _ = require('lodash');
var spawn = require('child_process').spawn;
var Promise = require('bluebird');
var testRunner = require('../../build-scripts/test-runner');
var os = require('os');

var ROOT = path.resolve(__dirname);
var OUTPUT_DIR = path.join(ROOT, 'output/');

function getOutputPath(relative) {
  if (relative) {
    return path.join(OUTPUT_DIR, relative);
  } else {
    return OUTPUT_DIR;
  }
}

gulp.task('topics:compile', ['topics:compile:babel', 'topics:compile:webpack']);

gulp.task('topics:compile:babel', function() {
  return babelPipeline(ROOT)
    .pipe(gulp.dest(getOutputPath('babel')));
});

gulp.task('topics:test', [/*'topics:test:server', 'topics:test:unit'*/]);

gulp.task('topics:test:server', function() {
  var executable = path.resolve(__dirname, './test/fixtures/runner-node.js');
  var env = { BLUEBIRD_DEBUG: 1, BABEL_DISABLE_CACHE: 1 };

  return Promise.try(function(){
    return spawn(executable, [], {
      stdio: 'inherit',
      env: _.extend({}, process.env, env)
    });
  }).then(function(command){
    return new Promise(function(resolve, reject) {
      command.on('close', function (code) {
        if (code) {
          reject(new Error(executable + ' exited with ' + code));
        } else {
          resolve();
        }
      });

      command.on('error', function(err) {
        reject(err);
      });
    });
  });
});

gulp.task('topics:test:unit', function() {
  return gulp.src([
    // ROOT + '/test/specs/browser/**/*.{js,jsx}',
    ROOT + '/test/specs/server/**/*.{js,jsx}',
    ROOT + '/test/specs/shared/**/*.{js,jsx}',
  ])
  .pipe(testRunner({
    compilers: {
      js: 'babel-register'
    },
    // nyc: {
    //   cache: true,
    //   reportDir: getOutputPath('coverage/'),
    //   reporter: 'lcov',
    // },
    env: {
      BABEL_ENV: 'test',
      BABEL_DISABLE_CACHE: 1,
      HOME: os.tmpdir()
    }
  }));
});

gulp.task('topics:compile:webpack', function(cb) {
  return webpackPipeline(ROOT, cb)
    .pipe(gulp.dest(getOutputPath('assets/js')));
});

gulp.task('topics:clean', function(cb) {
  del([
    getOutputPath()
  ], cb);
});
