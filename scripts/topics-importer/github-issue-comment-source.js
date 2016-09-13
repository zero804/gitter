'use strict';

var TentaclesStreams = require('tentacles-streams');
var RxNode = require('rx-node');

function githubIssueCommentSource(options) {
  /* Options are passed through to the tentacles client. */
  var client = new TentaclesStreams({ accessToken: process.env.GITHUB_ACCESS_TOKEN });
  var stream = client.issueComment.listForIssue(options.repoUri, options.issueNumber)

  return RxNode.fromReadableStream(stream);
}


module.exports = githubIssueCommentSource;
