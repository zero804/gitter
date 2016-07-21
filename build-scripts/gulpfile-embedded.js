'use strict';

var gulp = require('gulp');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var mqpacker = require('css-mqpacker');
var csswring = require('csswring');
var styleBuilder = require('./style-builder');
var getSourceMapOptions = require('./get-sourcemap-options');
var webpack = require('gulp-webpack');
var uglify = require('gulp-uglify');

var cssDestDir = 'output/assets/styles';
var cssWatchGlob = 'public/**/*.less';

/**
 * Hook into the compile stage
 */
gulp.task('embedded:compile', ['clientapp:compile:copy-files', 'embedded:compile:css', 'embedded:compile:webpack']);

var cssIosStyleBuilder = styleBuilder([
  'public/less/mobile-native-chat.less'
], {
  dest: cssDestDir,
  watchGlob: cssWatchGlob,
  sourceMapOptions: getSourceMapOptions(),
  lessOptions: {
    paths: ['public/less'],
    globalVars: {
      'target-env': '"mobile"'
    }
  },
  streamTransform: function(stream) {
    return stream
      .pipe(postcss([
        autoprefixer({
          browsers: ['ios_saf >= 6'],
          cascade: false
        }),
        mqpacker,
        csswring
      ]));
  }
});

gulp.task('embedded:compile:css', function() {
  return cssIosStyleBuilder.build();
});


/* Generate embedded native */
gulp.task('embedded:compile:webpack', ['clientapp:compile:copy-files'], function() {
  return gulp.src('./public/js/webpack-mobile-native.config')
    .pipe(webpack(require('../public/js/webpack-mobile-native.config')))
    .pipe(gulp.dest('output/assets/js'));
});

gulp.task('embedded:post-compile', ['embedded:post-compile:uglify']);

gulp.task('embedded:post-compile:uglify', function() {
  return gulp.src('output/assets/js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('output/assets/js'));
});

gulp.task('clientapp:compile:copy-files', function() {
  return gulp.src([
      'public/fonts/**',
      'public/images/**',
      // 'public/sprites/**',
      'public/repo/katex/**',
    ], {
      base: "./public",
      stat: true
    })
    .pipe(gulp.dest('output/assets'));
});
