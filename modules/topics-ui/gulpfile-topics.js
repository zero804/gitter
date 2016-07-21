/* eslint-disable node/no-unpublished-require */
'use strict';

var gulp = require('gulp');
var del = require('del');
var path = require('path');
var webpackPipeline = require('./dev/gulp-tasks-webpack');
var babelPipeline = require('./dev/gulp-tasks-babel');

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

gulp.task('topics:compile:webpack', function() {
  return webpackPipeline(ROOT)
    .pipe(gulp.dest(getOutputPath('assets/js')));
});

gulp.task('topics:clean', function(cb) {
  del([
    getOutputPath()
  ], cb);
});
