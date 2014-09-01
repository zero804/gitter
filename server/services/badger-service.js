/* jshint node:true */
"use strict";

var format = require('util').format;
var github = require('octonode');
var _ = require('underscore');
var Q = require('q');

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

function getRepoNameFromBranchUrl(url) {
  url = urlForGithubClient(url);
  var m = /\/repos\/([\w\-]+)\/([\w\-]+)\/.*/.exec(url);
  if(!m) return;

  return m[1] + '/' + m[2];
}

function pullRequestHeadFromBranch(branch) {
  var branchName = branch.ref.replace(/^.*\//, '');
  var m = /\/repos\/([\w\-]+)\/.*/.exec(branch.url);
  if(!m) return;

  return m[1] + ':' + branchName;
}

function injectBadgeIntoMarkdown(content, badgeContent) {
  var lines = content.split(/\n/);
  var i = 0;
  var seenHeader = false;
  for(;i < lines.length;i++) {
    if(/^\s*(\#+|={3,}|-{3,})/.test(lines[i])) {
      seenHeader = true;
    } else {
      // No longer a header
      break;
    }
  }
  lines.splice(i, 0, badgeContent);

  return lines.join('\n');
}

function ReadmeUpdater(context) {
  var client = new Client(context.token);

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

  function createPullRequest(branchRef) {
    var pullRequestHead = pullRequestHeadFromBranch(branchRef);

    var prRequest = {
      title: 'Add a Gitter badge to the readme',
      body: 'Adds the Gitter badge to the repository.',
      base: 'master',
      head: pullRequestHead
    };

    return client.post(format('/repos/%s/pulls', context.sourceRepo), prRequest);
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

            // No readme file exists
            var readme = {
              path: 'README.md',
              mode: "100644",
              content: "HELLO"
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
            "date": new Date().toISOString()
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
    // Firstly, decide whether to create a fork
    return doForkIfRequired()
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

function updateFileAndCreatePullRequest(sourceRepo, user, primaryBranch, branchPrefix, badgeContent) {
  return new ReadmeUpdater({
    token: '***REMOVED***',
    sourceRepo: sourceRepo,
    user: 'gitter-badger',
    primaryBranch: primaryBranch,
    branchPrefix: branchPrefix,
    badgeContent: badgeContent
  }).perform();
}
exports.updateFileAndCreatePullRequest = updateFileAndCreatePullRequest;
