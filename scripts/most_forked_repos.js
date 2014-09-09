#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var GithubRepo  = require('../server/services/github/github-repo-service');
var Q           = require('q');
var fs          = require('fs');

// Find public forked repos for a user.
function findUserForks(user) {
  var ghRepo = new GithubRepo(user);
  return ghRepo.getRepos()
  .then(function(repos) {
    var forks = repos.filter(function(repo) { return repo.fork; });
    var repoPromises = forks.map(function(fork) { return ghRepo.getRepo(fork.full_name); });

    return Q.allSettled(repoPromises)
    .then(function(results) {
      return results.reduce(function(accum, result) {
        if (result.state === "fulfilled") {
          var fork = result.value;
          if (!fork.source.private) accum.push(fork.source);
        }
        return accum;
      }, []);
    });
  });
}

persistence.User.findQ({})
.then(function(users) {
  var forksPromises = users.map(function(user) {
    return findUserForks(user);
  });

  return Q.allSettled(forksPromises);
})
.then(function (results) {
  var forks = {};

  results.forEach(function (result) {
    if (result.state !== "fulfilled") return;
    var repos = result.value;

    repos.forEach(function(repo) {
      if (forks[repo.full_name]) return forks[repo.full_name].count++;

      forks[repo.full_name] = {
        count:        1,
        name:         repo.full_name,
        description:  repo.description,
        language:     repo.language,
        stargazers:   repo.stargazers_count,
        forks:        repo.forks_count
      };
    });
  });

  var csv;
  Object.keys(forks).forEach(function(k) {
    var fork = forks[k];
    var csv_line = [fork.count, fork.name, '"' + fork.description + '"', '"' + fork.language + '"', fork.stargazers, fork.forks].join(',') + '\n';
    csv += csv_line;
  });

  fs.writeFileSync('forks.csv', csv);

}).then(function() {
  process.exit(0);
}).fail(function(err) {
  console.log(err);
  process.exit(1);
});
