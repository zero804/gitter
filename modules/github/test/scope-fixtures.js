"use strict";

var cases = [
  { scope: '', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'user', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'user:email', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'user:follow', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'public_repo', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'repo', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'repo_deployment', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'repo:status', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'delete_repo', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'notifications', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'gist', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'read:repo_hook', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'write:repo_hook', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'admin:repo_hook', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'read:public_key', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'write:public_key', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'admin:public_key', username: 'gittertestbot', githubToken: '***REMOVED***' },
  { scope: 'read:org', username: 'gittertestbot', githubToken: '***REMOVED***'}
];


module.exports = {
  scopes: cases,
  hash: cases.reduce(function(memo, value) {
    memo[value.scope] = value;
    return memo;
  }, {})
};
