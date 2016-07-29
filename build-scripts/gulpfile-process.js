'use strict';

var gulp = require('gulp');
var gzip = require('gulp-gzip');
var tar = require('gulp-tar');
var git = require('gulp-git');
var fs = require('fs');
var mkdirp = require('mkdirp');

/**
 * Hook into the package stage
 */
gulp.task('process:package', ['process:package:copy-app']);

/**
 * Hook into the post-package stage
 */
gulp.task('process:post-package', ['process:post-package:tarball']);


gulp.task('process:package:copy-app', ['process:package:copy-app:files', 'process:package:copy-app:version']);

gulp.task('process:package:copy-app:files', function() {
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

gulp.task('process:package:copy-app:version', function(done) {
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

gulp.task('process:post-package:tarball', function () {
  return gulp.src(['output/app/**'], { stat: true })
    .pipe(tar('app.tar'))
    .pipe(gzip({ append: true, gzipOptions: { level: 9 } }))
    .pipe(gulp.dest('output'));
});


gulp.task('process:watch:server', function() {
  var nodemon = require('gulp-nodemon');

  nodemon({
    debug: true,
    script: 'web.js',
    args: ['--cdn:use', 'true']
  });
});

gulp.task('process:watch:static', function() {
  var child_process = require('child_process');
  child_process.fork('./server/static', [], {
    env: {
      SERVE_STATIC_ASSETS: 1,
      PORT: 5001
    }
  });
});

gulp.task('process:watch', ['process:watch:server', 'process:watch:static'], function() {

})