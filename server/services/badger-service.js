/* jshint node:true */
"use strict";

var format               = require('util').format;
var github               = require('octonode');
var _                    = require('underscore');
var Q                    = require('q');
var conf                 = require('../utils/config');
var troupeTemplate       = require('../utils/troupe-template');
var templatePromise      = troupeTemplate.compile('github-pull-request-body');
var env                  = require('gitter-web-env');
var logger               = env.logger;
var stats                = env.stats;
var StatusError          = require('statuserror');
var badger               = require('readme-badger');
var path                 = require('path');

function insertBadge(repo, content, fileExt, user) {
  var imageUrl = conf.get('web:badgeBaseUrl') + '/Join%20Chat.svg';
  var linkUrl =  conf.get('web:basepath') + '/' + repo + '?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge';
  var altText = 'Join the chat at ' + conf.get('web:basepath') + '/' + repo;

  if(!badger.hasImageSupport(fileExt)) {
    stats.event('badger.inserted_plaintext', { userId: user.id, fileExt: fileExt });
  }

  return badger.addBadge(content, fileExt, imageUrl, linkUrl, altText);
}

function Client(token) {
  var client = github.client(token);

  var self = this;
  ['get', 'post', 'patch', 'put', 'del'].forEach(function(operation) {
    self[operation] = function(url, options) {
      var d = Q.defer();
      client[operation](url, options, function(err, status, body) {
        if(err) return d.reject(err);

        if(status >= 400) return d.reject(new StatusError(status, body && body.message || 'HTTP ' + status));
        d.resolve(body);
      });

      return d.promise;
    };
  });
}
var client = new Client('***REMOVED***');

function findReadme(tree, path) {
  if(!path) path = 'README.md';

  // Case sensitive first
  var result = _.find(tree, function(t) {
    return t.path === path;
  });
  if(result) return result;

  // Case insensitive second
  return _.find(tree, function(t) {
    return t.path.toLowerCase() === path.toLowerCase();
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

function ReadmeUpdater(context) {
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

  // GitHub can take some time after a fork to setup the gitrefs
  // Await the operation completion
  function getRefsAwait(repo) {
    var delay = 1000;
    var url = format('/repos/%s/git/refs/', repo);
    var start = Date.now();

    function get() {
      var timeTaken = (Date.now() - start) / 1000;
      if(timeTaken > 300 /* 5 minutes */) {
        return Q.reject(new Error('Timeout awaiting git data for ' + repo + ' after ' + timeTaken + 's'));
      }

      // Exponential backoff
      delay = Math.floor(delay * 1.1);

      return client.get(url, {}).
        then(function(refs) {
          if(!refs || !Array.isArray(refs) || !refs.length) {
            return Q.delay(delay).then(get);
          }

          return refs;
        }, function(err) {
          logger.info('Ignoring failed GitHub request to ' + url + ' failed: ' + err);
          return Q.delay(delay).then(get);
        });
    }

    return get();
  }

  function createBranch(repo) {
    // List the refs
    return getRefsAwait(repo)
      .then(function(refs) {
        function findRef(name) {
          return _.find(refs, function(r) {
            return r.ref === "refs/heads/" + name;
          });
        }

        // Find the correct ref
        var parentBranchRef = findRef(context.primaryBranch);

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

        var badgeOrLink = context.insertedPlaintext ? 'link' : 'badge';

        var prRequest = {
          title: 'Add a Gitter chat ' + badgeOrLink + ' to ' + context.readmeFileName,
          body: body,
          base: context.primaryBranch,
          head: pullRequestHead
        };

        return client.post(format('/repos/%s/pulls', context.sourceRepo), prRequest);
      });
  }

  function getExistingReadme() {
    return client.get(format('/repos/%s/readme', context.sourceRepo), {})
      .catch(function(err) {
        if(err.status === 404) return null;
      });
  }

  function updateReadme(treeUrl) {
    return Q.all([client.get(treeUrl, {}), getExistingReadme()])
      .spread(function(tree, readme) {
        var existingReadme = findReadme(tree.tree, readme && readme.path);

        if(existingReadme) {

          var content = new Buffer(readme.content, 'base64').toString('utf8');
          var fileExt = path.extname(existingReadme.path).substring(1);

          content = insertBadge(context.sourceRepo, content, fileExt, context.user);
          context.insertedPlaintext = !badger.hasImageSupport(fileExt);

          context.readmeFileName = existingReadme.path;
          var readmeNode = {
            path: existingReadme.path,
            mode: existingReadme.mode,
            content: content
          };

          return {
            base_tree: tree.sha,
            tree: [readmeNode]
          };
        }

        // No readme file exists
        context.readmeFileName = 'README.md';
        context.insertedPlaintext = false;

        var newReadme = {
          path: 'README.md',
          mode: "100644",
          content: "# " + context.sourceRepo.replace(/^.*\//,'') + "\n" + context.badgeContent
        };

        return {
          base_tree: tree.sha,
          tree: [newReadme]
        };

              });
  }

  function prepareTreeForCommit(branchRef) {
    return client.get(urlForGithubClient(branchRef.object.url), {})
      .then(function(commit) {
        var treeUrl = urlForGithubClient(commit.tree.url);

        return [updateReadme(treeUrl), commit.sha];
      });
  }

  function commitTree(tree, branchRef, latestCommitSha) {
    // Create a GIT tree
    return client.post(format('/repos/%s/git/trees', context.destinationRepo), tree)
      .then(function(tree) {

        var commitRequest = {
          "message": context.insertedPlaintext ? "Added Gitter link" : "Added Gitter badge",
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

function updateFileAndCreatePullRequest(sourceRepo, user, branchPrefix) {
  return new ReadmeUpdater({
    token: '***REMOVED***',
    sourceRepo: sourceRepo,
    user: user,
    branchPrefix: branchPrefix,
    badgeContent: getBadgeMarkdown(sourceRepo, 'badge'),
    badgeContentBody: getBadgeMarkdown(sourceRepo, 'body_badge')
  }).perform();
}

function getBadgeMarkdown(repo, content) {
  var contentLink = content ? '&utm_content=' + content : '';

  var imageUrl = conf.get('web:badgeBaseUrl') + '/Join%20Chat.svg';
  var linkUrl =  conf.get('web:basepath') + '/' + repo + '?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge' + contentLink;
  return '\n[![Gitter](' + imageUrl + ')](' + linkUrl + ')';
}

function sendBadgePullRequest(repo, user) {

  // The name of this stat is due to historical reasons
  stats.event('badger.clicked', { userId: user.id });

  return updateFileAndCreatePullRequest(repo, user.username, 'gitter-badge')
    .then(function (pr) {
      stats.event('badger.succeeded', { userId: user.id });
      return pr;
    })
    .catch(function(err) {
      stats.event('badger.failed', { userId: user.id });
      logger.error("Badger failed", { exception: err, uri: repo });

      // dont swollow this error, the client needs to be notified of our failure
      throw err;
    });
}

exports.sendBadgePullRequest = sendBadgePullRequest;
exports.testOnly = {
  client: client
};
