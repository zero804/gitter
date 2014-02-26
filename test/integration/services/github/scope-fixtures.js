/* jshint node:true  */
"use strict";

var cases = [
  { scope: '', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'user', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'user:email', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'user:follow', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'public_repo', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'repo', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'repo_deployment', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'repo:status', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'delete_repo', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'notifications', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'gist', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'read:repo_hook', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'write:repo_hook', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'admin:repo_hook', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'read:public_key', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'write:public_key', username: 'suprememoocow', githubToken: '***REMOVED***' },
  { scope: 'admin:public_key', username: 'suprememoocow', githubToken: '***REMOVED***' },
];


module.exports = {
  scopes: cases,
  hash: cases.reduce(function(memo, value) {
    memo[value.scope] = value;
    return memo;
  }, {})
};
