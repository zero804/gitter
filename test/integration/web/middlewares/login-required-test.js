/*global describe:true, it:true, before:false, after:false */
'use strict';

var loginRequired = require('../../test-require')('./web/middlewares/login-required');
var assert = require('assert');

describe('login-required', function() {

  it('redirects to /login by default', function(done) {
    var req = {
      nonApiRoute: true
    };

    var res = {
      relativeRedirect: function(url) {
        assert.equal(url, '/login');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('sets the returnTo if redirecting', function(done) {
    var req = {
      nonApiRoute: true,
      originalUrl: '/my-secret-page',
      session: {}
    };

    var res = {
      relativeRedirect: function() {
        assert.equal(req.session.returnTo, '/my-secret-page');
        done();
      }
    };

    loginRequired(req, res);
  });

  it('sends a 401 for json api requests', function(done) {
    var req = {
      nonApiRoute: false,
      accepts: function() {
        return 'json';
      }
    };

    var res = {
      status: function(number) {
        assert.equal(number, '401');
        return {
          send: function() {
            done();
          }
        };
      }
    };

    loginRequired(req, res);
  });

});
