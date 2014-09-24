/* jshint node:true */
"use strict";

var format               = require('util').format;
var github               = require('octonode');
var _                    = require('underscore');
var Q                    = require('q');
var conf                 = require('../utils/config');
var troupeTemplate       = require('../utils/troupe-template');
var templatePromise      = troupeTemplate.compile('github-pull-request-body');
var env                  = require('../utils/env');
var logger               = env.logger;
var stats                = env.stats;

function Client(token) {
  var client = github.client(token);

  var self = this;
  ['get', 'post', 'patch', 'put'].forEach(function(operation) {
    self[operation] = function(url, options) {
      var d = Q.defer();
      client[operation](url, options, function(err, status, body) {
        if(err) return d.reject(err);
        d.resolve(body);
      });

      return d.promise;
    };
  });

  this.getBlob = function(url) {
    var d = Q.defer();
    client.request(client.requestOptions({
      uri: client.buildUrl(url),
      method: 'GET',
      headers: {
        Accept: "application/vnd.github.3.0.raw"
      },
      json: false
    }), function(err, res, body) {
      if(err) return d.reject(err);
      if(res.status >= 400) return d.reject(new Error('HTTP ' + res.status));

      return d.resolve(body);
    });

    return d.promise;
  };
}

function findReadme(tree) {
  return _.find(tree, function(t) {
    return t.path.toLowerCase() === 'readme.md';
  });
}

function urlForGithubClient(url) {
  url = url.replace(/^https?:\/\/[A-Za-z0-9\-\.]+/, '');
  return url;
}

function pullRequestHeadFromBranch(branch) {
  var branchName = branch.ref.replace(/^.*\//, '');
  var m = /\/repos\/([\w\-]+)\/.*/.exec(branch.url);
  if(!m) return;

  return m[1] + ':' + branchName;
}

function findIdealLineForInsert(lines) {
  if(lines.length === 0) return 0;
  var i = 0;
  var seenHeader = false;

  for(;i < lines.length;i++) {
    if(/^\s*(\#+|={3,}|-{3,})/.test(lines[i])) {
      seenHeader = true;
    } else {
      if(seenHeader) break;
    }
  }

  return i;
}

function injectBadgeIntoMarkdown(content, badgeContent) {
  var lines = content.split(/\n/);
  var idealLine = findIdealLineForInsert(lines) || 0;

  lines.splice(idealLine, 0, badgeContent);

  return lines.join('\n');
}

function ReadmeUpdater(context) {
  var client = new Client(context.token);

  function findMainBranch() {
    return client.get(format('/repos/%s', context.sourceRepo), { })
      .then(function(repo) {
        if(!context.primaryBranch) {
          context.primaryBranch = repo.default_branch;
        }

        return repo;
      });
  }

  function doForkIfRequired() {
    // Create a fork
    return client.post(format('/repos/%s/forks', context.sourceRepo), { })
      .then(function(fork) {
        return fork.full_name;
      });
  }

  function createBranch(repo) {
    // List the refs
    return client.get(format('/repos/%s/git/refs/', repo), {})
      .then(function(refs) {
        function findRef(name) {
          return _.find(refs, function(r) {
            return r.ref === "refs/heads/" + name;
          });
        }

        // Find the correct ref
        var parentBranchRef = context.primaryBranch ? findRef(context.primaryBranch) : refs[0];

        // Not found?
        if(!parentBranchRef) {
          throw new Error('Cannot find branch ' + context.primaryBranch);
        }

        // Ensure the new branch name is unique
        var newBranchName;
        for(var c = 0, found = true; found; c++, found = findRef(newBranchName)) {
          newBranchName = c ? context.branchPrefix + '-' + c : context.branchPrefix;
        }

        var ref = {
          ref: "refs/heads/" + newBranchName,
          sha: parentBranchRef.object.sha
        };

        // Create the new branch
        return client.post(format('/repos/%s/git/refs', repo), ref);
      });
  }

  function generatePRBody() {
    return templatePromise.then(function(template) {
      return template(context);
    });
  }

  function createPullRequest(branchRef) {
    var pullRequestHead = pullRequestHeadFromBranch(branchRef);

    return generatePRBody()
      .then(function(body) {
        var prRequest = {
          title: 'Add a Gitter chat badge to ' + context.readmeFileName,
          body: body,
          base: context.primaryBranch,
          head: pullRequestHead
        };

        return client.post(format('/repos/%s/pulls', context.sourceRepo), prRequest);
      });
  }

  function prepareTreeForCommit(branchRef) {
    return client.get(urlForGithubClient(branchRef.object.url), {})
      .then(function(commit) {
        var treeUrl = urlForGithubClient(commit.tree.url);

        return [client.get(treeUrl, {})
          .then(function(tree) {
            var existingReadme = findReadme(tree.tree);
            if(existingReadme) {
              var blobUrl = urlForGithubClient(existingReadme.url);

              return client.getBlob(blobUrl)
                .then(function(content) {
                  content = injectBadgeIntoMarkdown(content, context.badgeContent);

                  context.readmeFileName = existingReadme.path;
                  var readme = {
                    path: existingReadme.path,
                    mode: existingReadme.mode,
                    content: content
                  };

                  return {
                    base_tree: tree.sha,
                    tree: [readme]
                  };
                  // return commitTree(repoName, commit.sha, branch.ref, treeForCommit);
                });
            }

            existingReadme.path = 'README.md';

            // No readme file exists
            var readme = {
              path: 'README.md',
              mode: "100644",
              content: ""
            };

            return {
              base_tree: tree.sha,
              tree: [readme]
            };
          }), commit.sha];
      });
  }

  function commitTree(tree, branchRef, latestCommitSha) {
    // Create a GIT tree
    return client.post(format('/repos/%s/git/trees', context.destinationRepo), tree)
      .then(function(tree) {
        var commitRequest = {
          "message": "Added Gitter badge",
          "author": {
            "name": "The Gitter Badger",
            "email": "badger@gitter.im",
            "date": new Date().toISOString().replace(/\.\d+/,'') // GitHub doesn't consider milliseconds as part of ISO8601
          },
          "parents": [latestCommitSha],
          "tree": tree.sha
        };

        // Create a commit for the tree
        return client.post(format('/repos/%s/git/commits', context.destinationRepo), commitRequest);
      })
      .then(function(commit) {
        var ref = {
          sha: commit.sha
        };

        return client.patch(format('/repos/%s/git/%s', context.destinationRepo, branchRef.ref), ref);
      });
  }

  this.perform = function() {
    return findMainBranch()
      .then(doForkIfRequired)
      .then(function(destinationRepo) {
        context.destinationRepo = destinationRepo;
        // Create the branch where we'll do the work
        return createBranch(destinationRepo);
      })
      .then(function(branchRef) {
        // Prepare a tree for the commit
        return prepareTreeForCommit(branchRef)
          .spread(function(treeForCommit, latestCommitSha) {
            // Commit the tree
            return commitTree(treeForCommit, branchRef, latestCommitSha);
          })
          .then(function() {
            // Finally, create a pull-request
            return createPullRequest(branchRef);
          });
      })
      .then(function(pullRequest) {
        return pullRequest;
      });
  };
}

function updateFileAndCreatePullRequest(sourceRepo, user, branchPrefix, badgeContent) {
  return new ReadmeUpdater({
    token: '***REMOVED***',
    sourceRepo: sourceRepo,
    user: user,
    branchPrefix: branchPrefix,
    badgeContent: badgeContent
  }).perform();
}

function sendBadgePullRequest(repo, user) {
  var imageUrl = conf.get('web:badgeBaseUrl') + '/Join Chat.svg';
  var linkUrl =  conf.get('web:basepath') + '/' + repo + '?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge';
  var markdown = '[![Gitter](' + imageUrl + ')](' + linkUrl + ')';

  return updateFileAndCreatePullRequest(repo, user.username, 'gitter-badge', markdown)
    .then(function (pr) {
      stats.event('badger.succeeded', { userId: user.id });
      return pr;
    })
    .fail(function(err) {
      stats.event('badger.failed', { userId: user.id });
      logger.error("Badger failed", { exception: err, uri: repo });

      // dont swollow this error, the client needs to be notified of our failure
      throw err;
    });
}

exports.sendBadgePullRequest = sendBadgePullRequest;
