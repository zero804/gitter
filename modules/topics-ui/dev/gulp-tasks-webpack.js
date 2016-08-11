'use strict';

var gulp = require('gulp');
var webpack = require('gulp-webpack');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var es = require('event-stream');
var filter = require('gulp-filter');

function webpackPipeline(rootDir) {
  var javascriptFileFilter = filter(['**/*.js'], { restore: true, passthrough: false });

  var jsStream = gulp.src(rootDir + '/webpack.config.js')
    .pipe(webpack(require('../webpack.config')))
    .pipe(sourcemaps.init({ /* loadMaps: true */ debug:true }))
    .pipe(javascriptFileFilter) // Filter out everything except js files from here on
    .pipe(uglify())

  return es.merge(javascriptFileFilter.restore, jsStream)
    .pipe(sourcemaps.write('../maps'));
}

module.exports = webpackPipeline;
