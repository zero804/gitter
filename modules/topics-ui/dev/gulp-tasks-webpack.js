'use strict';

var gulp = require('gulp');
var webpack = require('gulp-webpack');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var filter = require('gulp-filter');
var pump = require('pump');

function webpackPipeline(rootDir, cb) {
  var javascriptFileFilter = filter(['**/*.js'], { restore: true, passthrough: false });

  return pump([
    gulp.src(rootDir + '/webpack.config.js'),
    webpack(require('../webpack.config')),
    sourcemaps.init({ /* loadMaps: true */ debug:true }),
    javascriptFileFilter,
    uglify(),
    javascriptFileFilter.restore,
    sourcemaps.write('../maps')
  ], cb);
}

module.exports = webpackPipeline;
