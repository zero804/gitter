'use strict';

var gulp = require('gulp');
var argv = require('yargs').argv;
var gutil = require('gulp-util');
var eslint = require('gulp-eslint');
var jsonlint = require('gulp-jsonlint');
var fs = require('fs-extra');
var mkdirp = require('mkdirp');
var github = require('gulp-github');
var eslintFilter = require('./eslint-filter');
var del = require('del');

function guessBaseBranch() {
  var branch = process.env.GIT_BRANCH;
  if (!branch) return 'develop';

  if (branch.match(/\bfeature\//)) return 'origin/develop';

  return 'origin/master';
}

gulp.task('linter:validate:config', function() {
  return gulp.src(['config/*.json'])
    .pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failOnError());
});

// Full eslint
gulp.task('linter:validate:eslint', function() {
  mkdirp.sync('output/eslint/');
  return gulp.src(['**/*.js','!node_modules/**','!public/repo/**'])
    .pipe(eslint({
      quiet: argv.quiet,
      extensions: ['.js', '.jsx']
    }))
    .pipe(eslint.format('checkstyle', function(checkstyleData) {
      fs.writeFileSync('output/eslint/checkstyle.xml', checkstyleData);
    }))
    .pipe(eslint.failAfterError());
});

// eslint of the diff
gulp.task('linter:validate:eslint-diff', function() {
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

/**
 * Hook into the validate phase
 */
gulp.task('linter:validate', ['linter:validate:config', 'linter:validate:eslint', 'linter:validate:eslint-diff']);


gulp.task('linter:clean', function (cb) {
  del([
    'output/'
  ], cb);
});
