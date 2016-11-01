/* eslint-disable node/no-unpublished-require */
'use strict';

var gulp = require('gulp');
var del = require('del');
var path = require('path');
var webpackPipeline = require('./dev/gulp-tasks-webpack');

var ROOT = path.resolve(__dirname);
var OUTPUT_DIR = path.join(ROOT, 'output/');

function getOutputPath(relative) {
  if (relative) {
    return path.join(OUTPUT_DIR, relative);
  } else {
    return OUTPUT_DIR;
  }
}

gulp.task('web-push:compile', ['web-push:compile:webpack']);

gulp.task('web-push:compile:webpack', function(cb) {
  return webpackPipeline(ROOT, cb)
    .pipe(gulp.dest(getOutputPath('assets/js')));
});

gulp.task('web-push:clean', function(cb) {
  del([
    getOutputPath()
  ], cb);
});
