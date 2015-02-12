/* jshint node:true */
'use strict';

var gulp = require('gulp');
var livereload = require('gulp-livereload');
var gutil = require("gulp-util");
var webpack = require('gulp-webpack');
var less = require('gulp-less');
var gzip = require('gulp-gzip');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-spawn-mocha');
var using = require('gulp-using');
var tar = require('gulp-tar');
var shrinkwrap = require('gulp-shrinkwrap');
var git = require('gulp-git');
var fs = require('fs');
var jshint = require('gulp-jshint');
var imagemin = require('gulp-imagemin');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var mqpacker = require('css-mqpacker');
var csswring = require('csswring');
var mkdirp = require('mkdirp');
var gulpif = require('gulp-if');
var sourcemaps = require('gulp-sourcemaps');
var shell = require('gulp-shell');

/* Don't do clean in gulp, use make */
var DEV_MODE = !!process.env.DEV_MODE;

gulp.task('validate-client-source', function() {
  /* This is a very lax jshint, only looking for major problems */
  return gulp.src(['public/js/**/*.js', 'shared/**/*.js'])
    .pipe(jshint({
      browser: true,
      devel: false,
      globalstrict: true,
      unused: false,
      laxbreak: true,
      laxcomma: true,
      "-W098": "", // Remove this later
      "-W069": "",
      "-W033": "",
      "-W030": "",
      "-W040": "",
      "-W093": "",
      "-W084": "",
      predef: ["module", "require"]
     }))
    .pipe(jshint.reporter('default', { verbose: true }))
    .pipe(jshint.reporter('fail'));
});

gulp.task('validate-server-source', function() {
  /* This is a very lax jshint, only looking for major problems */
  return gulp.src(['server/**/*.js', 'shared/**/*.js', '!server/web/faye-node.js'])
    .pipe(jshint({
      node: true,
      // globalstrict: true, // ENABLE
      devel: false,
      unused: false,
      "-W064": "", // Missing 'new' prefix when invoking a constructor
      "-W098": "", // Currently allow unused vars. Remove later
      "-W069": "", // [..] is better written in dot notation.
      "-W033": "", // Missing semicolon.
      "-W032": "", // Unnecessary semicolon.
     }))
    .pipe(jshint.reporter('default', { verbose: true }))
    .pipe(jshint.reporter('fail'));
});

gulp.task('validate', ['validate-client-source', 'validate-server-source']);


/**
 * test
 */
gulp.task('test-mocha', function() {
  mkdirp.sync('output/test-reports/');

  return gulp.src(['./test/integration/**/*.js', './test/public-js/**/*.js'], { read: false })
    .pipe(mocha({
      reporter: 'xunit-file',
      env: {
        XUNIT_FILE: 'output/test-reports/integration.xml',
        NODE_ENV: 'test'
      }
    }));
});

gulp.task('test-redis-lua', shell.task([
  './test/redis-lua/run-tests'
]));

gulp.task('test', ['test-mocha', 'test-redis-lua']);

gulp.task('localtest', function() {
  return gulp.src(['./test/integration/**/*.js', './test/public-js/**/*.js'], { read: false })
    .pipe(mocha({
      reporter: 'spec',
      env: {
        SKIP_BADGER_TESTS: 1
      }
    }));
});

gulp.task('copy-app-files', function() {
  return gulp.src([
      '.npmrc',
      'api.js',
      'web.js',
      'websockets.js',
      'package.json',
      'npm-shrinkwrap.json',
      'config/**',
      'public/templates/**',
      'public/layouts/**',
      'public/locales/**',
      'public/js/**',
      'locales/**',
      'scripts/**',
      'server/**',
      'shared/**',
      'redis-lua/**'
    ], { "base" : "." })
    .pipe(gulp.dest('output/app'));
});

gulp.task('add-version-files', function(done) {
  git.revParse({ args: 'HEAD' }, function (err, commit) {
    if(err) return done(err);

      git.revParse({ args: '--short HEAD' }, function (err, hash) {
        if(err) return done(err);

        git.revParse({ args: '--abbrev-ref HEAD' }, function (err, branch) {
          if(err) return done(err);

          // Prefix the asset tag with an S
          if(process.env.STAGED_ENVIRONMENT === 'true') {
            hash = 'S' + hash;
          }

          // Use jenkins variables
          if(branch === 'HEAD' && process.env.GIT_BRANCH) {
            branch = process.env.GIT_BRANCH;
          }

          mkdirp.sync('output/app/');

          fs.writeFileSync('output/app/ASSET_TAG', hash);
          fs.writeFileSync('output/app/GIT_COMMIT', commit);
          fs.writeFileSync('output/app/VERSION', branch);
          done();
        });
      });

  });

});

gulp.task('build-app', ['copy-app-files', 'add-version-files']);

gulp.task('tar-app', ['build-app'], function () {
    return gulp.src(['output/app/**'], { stat: true })
      .pipe(tar('app.tar'))
      .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
      .pipe(gulp.dest('output'));
});

gulp.task('prepare-app', ['build-app', 'tar-app']);

gulp.task('copy-asset-files', function() {
  return gulp.src([
      'public/fonts/**',
      'public/locales/**', // do we need this
      'public/images/**',
      'public/sprites/**',
      'public/repo/**',
    ], { "base" : "./public" })
    .pipe(gulp.dest('output/assets'));
});


// Run this task occassionally and check the results into git...
gulp.task('compress-images', function() {
  return gulp.src([
      'public/images/**',
      'public/sprites/**'
    ], { "base" : "./public" })
    .pipe(imagemin({
       progressive: true,
       optimizationLevel: 2
     }))
    .pipe(gulp.dest('./public'));
});

gulp.task('css-ios', function () {
  gulp.src([
    'public/less/mobile-native-chat.less',
    'public/less/mobile-native-userhome.less'
    ])
    .pipe(gulpif(DEV_MODE, sourcemaps.init()))
    .pipe(less({
      paths: ['public/less'],
      globalVars: {
        "target-env": '"mobile"'
      }
    }))
    .pipe(postcss([
      autoprefixer({
        browsers: ['ios_saf >= 6'],
        cascade: false
      }),
      mqpacker,
      csswring
    ]))
    .pipe(gulpif(DEV_MODE, sourcemaps.write('output/assets/styles')))
    .pipe(gulp.dest('output/assets/styles'));
});

gulp.task('css-mobile', function () {
  gulp.src([
    'public/less/mobile-login.less',
    'public/less/mobile-app.less',
    'public/less/mobile-nli-app.less',
    'public/less/mobile-userhome.less'
    ])
    .pipe(gulpif(DEV_MODE, sourcemaps.init()))
    .pipe(less({
      paths: ['public/less'],
      globalVars: {
        "target-env": '"mobile"'
      }
    }))
    .pipe(postcss([
      autoprefixer({
        browsers: [
          'last 4 ios_saf versions',
          'last 4 and_chr versions',
          'last 4 and_ff versions',
          'last 2 ie_mob versions'],
        cascade: false
      }),
      mqpacker,
      csswring
    ]))
    .pipe(gulpif(DEV_MODE, sourcemaps.write('output/assets/styles')))
    .pipe(gulp.dest('output/assets/styles'));
});

gulp.task('css-web', function () {
  gulp.src([
    'public/less/signup.less',
    'public/less/trpAppsPage.less',
    'public/less/oauth-error-page.less',
    'public/less/generic-layout.less',
    'public/less/trpHooks.less',
    'public/less/login.less',
    'public/less/homepage.less',
    'public/less/explore.less',
    'public/less/not-found.less',
    'public/less/about.less',
    'public/less/router-chat.less',
    'public/less/router-app.less',
    'public/less/router-nli-app.less',
    'public/less/router-nli-chat.less',
    'public/less/router-embed-chat.less',
    'public/less/chat-card.less',
    'public/less/router-archive-home.less',
    'public/less/router-archive-chat.less',
    'public/less/userhome.less'
    ])
    .pipe(gulpif(DEV_MODE, sourcemaps.init()))
    .pipe(less({
      paths: ['public/less'],
      globalVars: {
        "target-env": '"web"'
      }
    }))
    .pipe(postcss([
      autoprefixer({
        browsers: [
          'Safari >= 5',
          'last 4 Firefox versions',
          'last 4 Chrome versions',
          'IE >= 10'],
        cascade: false
      }),
      mqpacker,
      csswring
    ]))
    .pipe(gulpif(DEV_MODE, sourcemaps.write('output/assets/styles')))
    .pipe(gulp.dest('output/assets/styles'));
});

gulp.task('css', ['css-web', 'css-mobile', 'css-ios']);

gulp.task('webpack', function() {
  return gulp.src('./public/js/webpack.config')
    .pipe(webpack(require('./public/js/webpack.config')))
    .pipe(gulp.dest('output/assets/js'));
});

gulp.task('build-assets', ['copy-asset-files', 'css', 'webpack']);


gulp.task('compress-assets', ['build-assets'], function() {
  return gulp.src(['output/assets/**/*.{css,js,ttf,svg}'], { base: 'output/assets/' })
    .pipe(using())
    .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
    .pipe(gulp.dest('output/assets/'));
});

gulp.task('tar-assets', ['build-assets', 'compress-assets'], function () {
    return gulp.src(['output/assets/**'])
      .pipe(tar('assets.tar'))
      .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
      .pipe(gulp.dest('output'));
});

gulp.task('prepare-assets', ['build-assets', 'compress-assets', 'tar-assets']);

/**
 * package
 */
gulp.task('package', ['prepare-app', 'prepare-assets']);

/**
 * default
 */
gulp.task('default', ['test', 'package']);



/**
 * watch
 */
gulp.task('watch', ['css'], function() {
  livereload.listen();
  gulp.watch('public/**/*.less', ['css']).on('change', livereload.changed);
});
