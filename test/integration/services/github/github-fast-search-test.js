/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../../test-require');
var assert = require("assert");

var FAKE_USER = { username: 'gittertestbot', githubToken: '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8'};

describe('github-fast-search', function() {
  it('has type:user flag formatted correctly', function(done) {
    var Search = testRequire.withProxies('./services/github/github-fast-search', {
      './request-wrapper': {
          fastRequest: function(options) {
          var querystring = options.uri.split('?')[1];

          assert.equal(querystring, 'q=tony+type:user&access_token=64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8');

          done();
        }
      },
      './github-cache-wrapper': function(x) { return x; }
    });

    var search = new Search(FAKE_USER);

    search.findUsers('tony', function(err) {
      if(err) done(err);
    });
  });

  it('adds a credentials flag to a 403 response error', function(done) {
    var Search = testRequire.withProxies('./services/github/github-fast-search', {
      './request-wrapper': {
        fastRequest: function(options, callback) {
          callback(null, { statusCode: 403 }, null);
        }
      },
      './github-cache-wrapper': function(x) { return x; }
    });

    var search = new Search(FAKE_USER);

    search.findUsers('tony', function(err) {
      assert.equal(err.gitterAction,'logout_destroy_user_tokens');

      done();
    });
  });
});
