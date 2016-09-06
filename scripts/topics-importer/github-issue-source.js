'use strict';

var TentaclesStreams = require('tentacles-streams');
var RxNode = require('rx-node');

function githubIssueStream(options) {
  /* Options are passed through to the tentacles client. */
  var client = new TentaclesStreams({ accessToken: process.env.GITHUB_ACCESS_TOKEN });
  
  var stream = client.issue.listForRepo(options.repoUri, {
    query: {
      state: options.state,
      labels: options.labels
    }
  });

  return RxNode.fromReadableStream(stream);
}


module.exports = githubIssueStream;
