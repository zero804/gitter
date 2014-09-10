#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var GithubRepo  = require('../server/services/github/github-repo-service');
var Q           = require('q');
var fs          = require('fs');
var throat      = require('throat');

// Limit parallellism
var limit = throat(100);

// Find public forked repos for a user.
function findUserForks(user) {
  var ghRepo = new GithubRepo(user);
  return ghRepo.getRepos()
  .then(function(repos) {
    repos.forEach(function(repo) {
      if (!repo.fork && !repo.private && repo.stargazers_count > 100) {
        persistence.Troupe.findOneQ({uri: repo.full_name})
        .then(function(room) {
          if (!room) fs.appendFileSync('popularRepos.csv', repo.full_name + '\n');
        });
      }
    });
    
    var forks = repos.filter(function(repo) { return repo.fork; });
    console.log('User:', user.username, ' - Forks:', forks.length);

    var repoPromises = forks.map(function(fork) { return limit(function() { return ghRepo.getRepo(fork.full_name); } ); });

    return Q.allSettled(repoPromises)
    .then(function(results) {
      return results.reduce(function(accum, result) {
        if (result.state !== "fulfilled") return accum;
        var fork = result.value;
        if (!fork.source.private) accum.push(fork.source);
        return accum;
      }, []);
    });
  });
}

persistence.User.find({}).sort({_id: 1}).limit(10).skip(0).execQ()
.then(function(users) {
  var _users = users.filter(function(user) { return user.githubUserToken; });
  var forksPromises = _users.map(function(user) {
    return limit(function() { return findUserForks(user); });
  });

  return Q.allSettled(forksPromises);
})
.then(function (results) {

  results.forEach(function (result) {
    console.log('Result:', result.state);
    if (result.state !== "fulfilled") return;
    console.log('Forks: ', result.value.length);
    var repos = result.value;

    repos.forEach(function(repo) {
      var fork = {
        name:         repo.full_name,
        description:  repo.description,
        language:     repo.language,
        stargazers:   repo.stargazers_count,
        forks:        repo.forks_count
      };

      var csv_line = [fork.name, '"' + fork.description + '"', '"' + fork.language + '"', fork.stargazers, fork.forks].join(',');
      fs.appendFileSync('forks.csv', csv_line + '\n');
    });
  });

  //var csv = [];
  //Object.keys(forks).forEach(function(k) {
  //  var fork = forks[k];
  //  var csv_line = [fork.count, fork.name, '"' + fork.description + '"', '"' + fork.language + '"', fork.stargazers, fork.forks].join(',');
  //  csv.push(csv_line);
  //});

  //fs.writeFileSync('forks.csv', csv.join('\n'));
  //fs.writeFileSync('popularRepos.csv', popularRepos.join('\n'));

}).then(function() {
  process.exit(0);

}).fail(function(err) {
  console.log(err, err.stack);
  process.exit(1);
});
