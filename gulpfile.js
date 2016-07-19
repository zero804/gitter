'use strict';

var Promise = require('bluebird');
var argv = require('yargs').argv;
var gulp = require('gulp');

var through = require('through2');
var gutil = require('gulp-util');
var runSequence = require('run-sequence');
var sourcemaps = require('gulp-sourcemaps');

var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var mqpacker = require('css-mqpacker');
var csswring = require('csswring');
var styleBuilder = require('./build-scripts/style-builder');

var webpack = require('gulp-webpack');
var eslint = require('gulp-eslint');

var gzip = require('gulp-gzip');
var mocha = require('gulp-spawn-mocha');
var using = require('gulp-using');
var tar = require('gulp-tar');
var git = require('gulp-git');

var shell = require('gulp-shell');
var jsonlint = require('gulp-jsonlint');
var uglify = require('gulp-uglify');
var codecov = require('gulp-codecov');
var lcovMerger = require('lcov-result-merger');
var utimes = require('fs').utimes;

var fs = require('fs-extra');
var path = require('path');
var mkdirp = require('mkdirp');
var del = require('del');
var glob = require('glob');
var github = require('gulp-github');
var eslintFilter = require('./build-scripts/eslint-filter');

var getSourceMapUrl = function() {
  if (!process.env.BUILD_URL) return;

  return process.env.BUILD_URL + 'artifact/output';
};


var getGulpSourceMapOptions = function(mapsSubDir) {
  var sourceMapUrl = getSourceMapUrl();
  if (!sourceMapUrl) {
    return {
      dest: '.'
    };
  }
  var suffix = mapsSubDir ? mapsSubDir + '/' : '';

  mkdirp.sync('output/maps/' + suffix);

  return {
    dest: path.relative('./output/assets/js/' + suffix + '/', './output/maps/' + suffix + '/'),
    options: {
      sourceRoot: path.relative('./output/maps/' + suffix, './output/assets/js/' + suffix),
      sourceMappingURLPrefix: sourceMapUrl,
    }
  };
};


var cssDestDir = 'output/assets/styles';
var cssWatchGlob = 'public/**/*.less';



/* Don't do clean in gulp, use make */
var RUN_TESTS_IN_PARALLEL = false;
if (process.env.PARALLEL_TESTS) {
  RUN_TESTS_IN_PARALLEL = true;
}

var testModules = {
};

var modulesWithTest = glob.sync('./modules/*/test');
modulesWithTest.forEach(function(testDir) {
  var moduleDir = path.dirname(testDir);
  var moduleName = path.basename(moduleDir);
  testModules[moduleName] = {
    files: path.join('modules', moduleName, 'test', '**', '*.js'),
    includeInFast: false
  }
});

testModules['api-tests'] = {
  files: ['./test/api-tests/**/*.js'],
  options: {
    // These tests load the entire app, so mocha will sometimes timeout before it even runs the tests
    timeout: 30000
  },
  includeInFast: false
};

testModules.integration = {
  files: ['./test/integration/**/*.js', './test/public-js/**/*.js'],
  includeInFast: true
};

/** Make a series of tasks based on the test modules */
function makeTestTasks(taskName, generator, isFast) {
  Object.keys(testModules).forEach(function(moduleName) {
    var definition = testModules[moduleName];

    if (isFast && !definition.includeInFast) {
      return;
    }

    gulp.task(taskName + '-' + moduleName, function() {
      return generator(moduleName, definition.files, definition.options || {});
    });
  });

  var childTasks = Object.keys(testModules)
    .filter(function(moduleName) {
      var definition = testModules[moduleName];
      return !isFast || definition.includeInFast;
    })
    .map(function(moduleName) { return taskName + '-' + moduleName; });

  if (RUN_TESTS_IN_PARALLEL) {
    // Run tests in parallel
    gulp.task(taskName, childTasks);
  } else {
    // Run tests in sequence
    gulp.task(taskName, function(callback) {
      gutil.log('Run sequence for ' + taskName,childTasks.join(','));

      var args = childTasks.concat(callback);
      runSequence.apply(null, args);
    });
  }

}

gulp.task('validate-config', function() {
  return gulp.src(['config/*.json'])
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failOnError());
});

// Full eslint
gulp.task('validate-eslint', function() {
  mkdirp.sync('output/eslint/');
  return gulp.src(['**/*.js','!node_modules/**','!public/repo/**'])
    .pipe(eslint({
      quiet: argv.quiet
    }))
    .pipe(eslint.format('checkstyle', function(checkstyleData) {
      fs.writeFileSync('output/eslint/checkstyle.xml', checkstyleData);
    }))
    .pipe(eslint.failAfterError());
});

function guessBaseBranch() {
  var branch = process.env.GIT_BRANCH;
  if (!branch) return 'develop';

  if (branch.match(/\bfeature\//)) return 'origin/develop';

  return 'origin/master';
}

// eslint of the diff
gulp.task('validate-eslint-diff', function() {
  var baseBranch = process.env.BASE_BRANCH || guessBaseBranch();
  gutil.log('Performing eslint comparison to', baseBranch);

  var eslintPipe = gulp.src(['**/*.js','!node_modules/**','!public/repo/**'], { read: false })
    .pipe(eslintFilter.filterFiles(baseBranch))
    .pipe(eslint({
      quiet: argv.quiet
    }))
    .pipe(eslintFilter.filterMessages())
    .pipe(eslint.format('unix'))

  if (process.env.SONARQUBE_GITHUB_ACCESS_TOKEN && process.env.ghprbPullId && process.env.GIT_COMMIT) {
    eslintPipe = eslintPipe.pipe(github({
       git_token: process.env.SONARQUBE_GITHUB_ACCESS_TOKEN,
       git_repo: 'troupe/gitter-webapp',
       git_prid: process.env.ghprbPullId,
       git_sha: process.env.GIT_COMMIT,
    }));
  }

  return eslintPipe;
});


gulp.task('validate', ['validate-config', 'validate-eslint', 'validate-eslint-diff']);

makeTestTasks('test-mocha', function(name, files, options) {
  mkdirp.sync('output/test-reports/');
  mkdirp.sync('output/coverage-reports/' + name);

  gutil.log('Writing XUnit output', 'output/test-reports/' + name + '.xml');

  var mochaOpts = {
    reporter: 'mocha-multi',
    timeout: options.timeout || 10000,
    istanbul: {
      dir: 'output/coverage-reports/' + name
    },
    env: {
      multi: 'spec=- xunit=output/test-reports/' + name + '.xml',
      NODE_ENV: 'test',
      BLUEBIRD_DEBUG: 1,
      TZ: 'UTC'
    }
  };

  var grepOpt = argv.grep || argv.g;
  if(grepOpt) {
    mochaOpts.grep = grepOpt;
  }

  return gulp.src(files, { read: false })
    .pipe(mocha(mochaOpts));
});

makeTestTasks('test-docker', function(name, files, options) {
  mkdirp.sync('output/test-reports/');
  mkdirp.sync('output/coverage-reports/' + name);
  gutil.log('Writing XUnit output', 'output/test-reports/' + name + '.xml');
  var istanbulOptions;

  if (argv['coverage'] === false) {
    istanbulOptions = undefined;
  } else {
    istanbulOptions = {
      dir: 'output/coverage-reports/' + name
    };
  }

  return gulp.src(files, { read: false })
    .pipe(mocha({
      reporter: 'mocha-multi',
      timeout: options.timeout || 10000,
      istanbul: istanbulOptions,
      env: {
        multi: 'spec=- xunit=output/test-reports/' + name + '.xml',
        NODE_ENV: 'test-docker',
        Q_DEBUG: 1,
        BLUEBIRD_DEBUG: 1
      }
    }));
});

gulp.task('test-redis-lua', shell.task([
  './test/redis-lua/run-tests'
]));

gulp.task('merge-lcov', function() {
  return gulp.src('output/coverage-reports/**/lcov.info')
    .pipe(using())
    .pipe(lcovMerger())
    .pipe(gulp.dest('output/coverage-reports/merged/'));
});

gulp.task('submit-codecov-post-tests', ['merge-lcov'], function() {
  process.env.CODECOV_TOKEN = "4d30a5c7-3839-4396-a2fd-d8f9a68a5c3a";

  return gulp.src('output/coverage-reports/merged/lcov.info')
    .pipe(codecov())
    .on('error', function(err) {
      gutil.log(err);
      this.emit('end');
    });
});

gulp.task('submit-codecov', ['test-mocha'/*, 'test-redis-lua'*/], function(callback) {
  runSequence('submit-codecov-post-tests', callback);
});

gulp.task('test', ['test-mocha'/*, 'test-redis-lua'*/, 'submit-codecov']);

makeTestTasks('localtest', function(name, files, options) {
  return gulp.src(files, { read: false })
    .pipe(mocha({
      reporter: 'spec',
      timeout: options.timeout || 10000,
      bail: !!process.env.BAIL,
      env: {
        SKIP_BADGER_TESTS: 1,
        DISABLE_CONSOLE_LOGGING: 1,
        Q_DEBUG: 1,
        BLUEBIRD_DEBUG: 1
      }
    }));
});

gulp.task('test-perf-benchmarkjs', shell.task([
  'for i in test/benchmarks/*.js; do NODE_ENV=test node $i; done',
], { timeout: 120000 }));

gulp.task('test-perf', ['test-perf-benchmarkjs']);

gulp.task('benchmark-local', shell.task([
  'for i in test/benchmarks/*.js; do node $i; done',
], { timeout: 120000 }));

gulp.task('clean:coverage', function (cb) {
  del([
    'output/coverage-reports'
  ], cb);
});

makeTestTasks('localtest-coverage', function(name, files, options) {
  mkdirp.sync('output/test-reports/');
  mkdirp.sync('output/coverage-reports/' + name);

  return gulp.src(files, { read: false })
    .pipe(mocha({
      reporter: 'spec',
      timeout: options.timeout || 10000,
      istanbul: {
        dir: 'output/coverage-reports/' + name
      },
      env: {
        SKIP_BADGER_TESTS: 1,
        DISABLE_CONSOLE_LOGGING: 1,
        Q_DEBUG: 1,
        BLUEBIRD_DEBUG: 1
      }
    }));
});

makeTestTasks('fasttest', function(name, files /*, options*/) {
  return gulp.src(files, { read: false })
    .pipe(mocha({
      reporter: 'spec',
      grep: '#slow',
      invert: true,
      bail: true,
      env: {
        TAP_FILE: "output/test-reports/" + name + ".tap",
        SKIP_BADGER_TESTS: 1,
        DISABLE_CONSOLE_LOGGING: 1
      }
    }));
}, true);

gulp.task('copy-app-files', function() {
  return gulp.src([
      '.npmrc',
      'api.js',
      'web.js',
      'websockets.js',
      'package.json',
      'npm-shrinkwrap.json',
      'newrelic.js',
      'config/**',
      'public/templates/**',
      'public/layouts/**',
      'public/js/**',
      'scripts/**',
      'server/**',
      'shared/**',
      'redis-lua/**',
      'modules/**'
    ], { base: "." })
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
      'public/images/**',
      'public/sprites/**',
      'public/repo/**'
    ], { base: "./public" })
    .pipe(gulp.dest('output/assets'))
    .pipe(restoreOriginalFileTimestamps());
});

// Run this task occassionally and check the results into git...
// Disabled as it adds loads of extra time to npm install
// and since we almost never use it
// It hasn't been deleted as we may one day find it useful again
// gulp.task('compress-images', function() {
//   return gulp.src([
//       'public/images/**',
//       'public/sprites/**'
//     ], { "base" : "./public" })
//     .pipe(imagemin({
//        progressive: true,
//        optimizationLevel: 2
//      }))
//     .pipe(gulp.dest('./public'));
// });
//



var cssIosStyleBuilder = styleBuilder([
  'public/less/mobile-native-chat.less'
], {
  dest: cssDestDir,
  watchGlob: cssWatchGlob,
  sourceMapOptions: getGulpSourceMapOptions(),
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

gulp.task('css-ios', function() {
  return cssIosStyleBuilder.build();
});


var cssMobileStyleBuilder = styleBuilder([
  'public/less/mobile-app.less',
  'public/less/mobile-nli-app.less',
  'public/less/mobile-userhome.less',
  'public/less/mobile-native-userhome.less'
], {
  dest: cssDestDir,
  watchGlob: cssWatchGlob,
  sourceMapOptions: getGulpSourceMapOptions(),
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
          browsers: [
            'last 4 ios_saf versions',
            'last 4 and_chr versions',
            'last 4 and_ff versions',
            'last 2 ie_mob versions'
          ],
          cascade: false
        }),
        mqpacker,
        csswring
      ]));
  }
});

gulp.task('css-mobile', function() {
  return cssMobileStyleBuilder.build();
});

var cssWebStyleBuilder = styleBuilder([
  'public/less/trpAppsPage.less',
  'public/less/error-page.less',
  'public/less/error-layout.less',
  'public/less/generic-layout.less',
  'public/less/trpHooks.less',
  'public/less/login.less',
  'public/less/explore.less',
  'public/less/router-chat.less',
  'public/less/router-app.less',
  'public/less/router-nli-app.less',
  'public/less/router-nli-chat.less',
  'public/less/router-embed-chat.less',
  'public/less/router-nli-embed-chat.less',
  'public/less/chat-card.less',
  'public/less/router-archive-home.less',
  'public/less/router-archive-links.less',
  'public/less/router-archive-chat.less',
  'public/less/homepage.less',
  'public/less/userhome.less',
  'public/less/402.less',
  'public/less/org-page.less',
  'public/less/early-bird.less'
], {
  dest: cssDestDir,
  watchGlob: cssWatchGlob,
  sourceMapOptions: getGulpSourceMapOptions(),
  lessOptions: {
    paths: ['public/less'],
    globalVars: {
      'target-env': '"web"'
    }
  },
  streamTransform: function(stream) {
    return stream
      .pipe(postcss([
        autoprefixer({
          browsers: [
            'Safari >= 5',
            'last 4 Firefox versions',
            'last 4 Chrome versions',
            'IE >= 10'
          ],
          cascade: false
        }),
        mqpacker,
        csswring
      ]));
  }
});

gulp.task('css-web', function() {
  return cssWebStyleBuilder.build();
});


gulp.task('css', function() {
  return Promise.all([
    cssIosStyleBuilder.build(),
    cssMobileStyleBuilder.build(),
    cssWebStyleBuilder.build()
  ]);
});

gulp.task('webpack', function() {
  return gulp.src('./public/js/webpack.config')
    .pipe(webpack(require('./public/js/webpack.config')))
    .pipe(gulp.dest('output/assets/js'));
});

function getUglifyOptions() {
  if (process.env.FAST_UGLIFY && JSON.parse(process.env.FAST_UGLIFY)) {
    gutil.log('Using fast uglify. The resulting javascript artifacts will be much bigger');
    return {
      mangle: false,
      compress: false
    };
  }
}

gulp.task('uglify', ['webpack'], function() {
  var sourceMapOpts = getGulpSourceMapOptions();
  return gulp.src('output/assets/js/*.js')
    .pipe(sourcemaps.init({ /* loadMaps: true */ }))
    .pipe(uglify(getUglifyOptions()))
    .pipe(sourcemaps.write(sourceMapOpts.dest, sourceMapOpts.options))
    .pipe(gulp.dest('output/assets/js'));
});

gulp.task('embedded-uglify', ['embedded-webpack'], function() {
  var sourceMapOpts = getGulpSourceMapOptions();
  return gulp.src('output/assets/js/*.js')
    .pipe(sourcemaps.init({ /* loadMaps: true */ }))
    .pipe(uglify(getUglifyOptions()))
    .pipe(sourcemaps.write(sourceMapOpts.dest, sourceMapOpts.options))
    .pipe(gulp.dest('output/assets/js'));
});

gulp.task('build-assets', ['copy-asset-files', 'css', 'webpack', 'uglify']);


/**
 * Ensures that the file has the same mtime as the original source
 */
function restoreOriginalFileTimestamps() {
  return through.obj(function(file, enc, done) {
    utimes(file.path, file.stat.atime, file.stat.mtime, done);
  });

}

gulp.task('compress-assets-gzip', ['build-assets'], function() {
  return gulp.src(['output/assets/**/*.{css,js,ttf,svg,eot}', '!**/*.map'], { stat: true, base: 'output/assets/' })
    .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
    .pipe(gulp.dest('output/assets/'))
    .pipe(restoreOriginalFileTimestamps());
});

// Brotli compression for text files
gulp.task('compress-assets-brotli-text', ['build-assets'], function() {
  if (!process.env.ENABLE_BROTLI_COMPRESSION) return;

  var brotli = require('gulp-brotli');
  return gulp.src(['output/assets/**/*.{css,svg,js}', '!**/*.map'], { stat: true, base: 'output/assets/' })
    .pipe(brotli.compress({
      mode: 1, // 1 = TEXT
      extension: 'br',
      quality: 11
    }))
    .pipe(gulp.dest('output/assets/'))
    .pipe(restoreOriginalFileTimestamps());
});

// Brotli compression for non-text files
gulp.task('compress-assets-brotli-generic', ['build-assets'], function() {
  if (!process.env.ENABLE_BROTLI_COMPRESSION) return;

  var brotli = require('gulp-brotli');
  return gulp.src(['output/assets/**/*.{ttf,eot}', '!**/*.map'], { stat: true, base: 'output/assets/' })
    .pipe(brotli.compress({
      mode: 0, // 0 = GENERIC
      extension: 'br',
      quality: 11
    }))
    .pipe(gulp.dest('output/assets/'))
    .pipe(restoreOriginalFileTimestamps());
});

gulp.task('compress-assets-brotli', ['compress-assets-brotli-generic', 'compress-assets-brotli-text']);

gulp.task('compress-assets', ['compress-assets-brotli', 'compress-assets-gzip']);

gulp.task('tar-assets', ['build-assets', 'compress-assets'], function () {
    return gulp.src(['output/assets/**', '!**/*.map'], { stat: true })
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
gulp.task('default', function(callback) {
  runSequence('validate',
              'test',
              'package',
              callback);
});

/**
 * watch
 */
gulp.task('watch', function() {
  cssIosStyleBuilder.startWatching();
  cssMobileStyleBuilder.startWatching();
  cssWebStyleBuilder.startWatching();
});


// Run gulp safe-install --package xyz@0.1.0
gulp.task('safe-install', shell.task([
  'npm run unlink',
  'npm install --production',
  'npm prune --production',
  'npm install ' + argv.package + ' --save',
  'npm shrinkwrap',
  'npm install',
  'npm run link',
  'npm run fix-shrinkwrap-registry'
]));


/* Generate embedded native */
gulp.task('embedded-webpack', function() {
  return gulp.src('./public/js/webpack-mobile-native.config')
    .pipe(webpack(require('./public/js/webpack-mobile-native.config')))
    .pipe(gulp.dest('output/assets/js'));
});

gulp.task('embedded-copy-asset-files', function() {
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

gulp.task('embedded-package', ['embedded-uglify', 'css-ios', 'embedded-copy-asset-files']);
