'use strict';

var gulp = require('gulp');
var webpack = require('gulp-webpack');
var sourcemaps = require('gulp-sourcemaps');
// var uglify = require('gulp-uglify');

function webpackPipeline(rootDir) {
  return gulp.src(rootDir + '/webpack.config.js')
    .pipe(webpack(require('../webpack.config')))
    .pipe(sourcemaps.init({ /* loadMaps: true */ debug:true }))
    //.pipe(uglify())
    .pipe(sourcemaps.write('../maps'));
}

module.exports = webpackPipeline;
