'use strict';

var gulp = require('gulp');
var babel = require('gulp-babel');

function babelPipeline(rootDir) {
  return gulp.src(rootDir + '/shared/**/*.{js,jsx}')
    .pipe(babel({
      plugins: [
        "jsx-strip-ext",
        "add-module-exports"
      ].map(function(name) { return require.resolve('babel-plugin-' + name); })
    }));
}

module.exports = babelPipeline;
