'use strict';

const Promise = require('bluebird');
const path = require('path');
const gulp = require('gulp');
const glob = Promise.promisify(require('glob'));

const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer-core');
const mqpacker = require('css-mqpacker');
const csswring = require('csswring');
const styleBuilder = require('./style-builder');
const getSourceMapOptions = require('./get-sourcemap-options');
const webpack = require('webpack-stream');
const uglify = require('gulp-uglify');
const childProcessPromise = require('./child-process-promise');
const extractUrls = require('./extract-urls');

const cssDestDir = 'output/embedded/www/styles';
const cssWatchGlob = 'public/**/*.less';

/**
 * Hook into the compile stage
 */
gulp.task('embedded:compile', [
  'clientapp:compile:copy-files',
  'embedded:compile:markup',
  'embedded:compile:css',
  'embedded:compile:webpack'
]);

// We also copy files after the CSS is compiled in `embedded:post-compile:copy-linked-assets`
gulp.task('clientapp:compile:copy-files', function() {
  return gulp.src([
      'public/images/emoji/*',
      // 'public/sprites/**',
      'public/repo/katex/**',
    ], {
      base: './public',
      stat: true
    })
    .pipe(gulp.dest('output/embedded/www'));
});

gulp.task('embedded:compile:markup', function() {
  return childProcessPromise.spawn('node', [
    path.join(__dirname, './render-embedded-chat.js'),
    '--output', 'output/embedded/www/mobile/embedded-chat.html',
  ], process.env);
});

const cssIosStyleBuilder = styleBuilder([
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
    .pipe(gulp.dest('output/embedded/www/js'));
});

gulp.task('embedded:post-compile', [
  'embedded:post-compile:uglify',
  'embedded:post-compile:copy-linked-assets'
]);

gulp.task('embedded:post-compile:uglify', function() {
  return gulp.src('output/embedded/www/js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('output/embedded/www/js'));
});

gulp.task('embedded:post-compile:copy-linked-assets', function() {
  return Promise.all([
    extractUrls('output/embedded/www/styles/mobile-native-chat.css', 'output/embedded/www/'),
  ])
    .then((resourceLists) => {
      const resourceList = resourceLists.reduce((list, resultantList) => {
        return resultantList.concat(list);
      }, []);

      return gulp.src(resourceList, {
          base: './public',
          stat: true
        })
        .pipe(gulp.dest('output/embedded/www'));
    })
});
