/*jslint node:true, unused:true*/
"use strict";
var rest = require('restler-q');
var assert = require('assert');
var Q = require('q');
var BASE_URL = process.env.BASE_URL || 'http://localhost:5000/';

var token;

exports.token = function() {
  if(token) {
    return Q.resolve(token);
  }

  return rest.get(BASE_URL + 'testdata/oauthToken?email=testuser@troupetest.local')
    .then(function(pToken) {
      token = pToken;
      return token;
    });
};

exports.troupeId = function() {
  return exports.token()
    .then(function(token) {
      return rest.get(BASE_URL + 'troupes', {
          headers: { Authorization: 'Bearer ' + token }
        })
        .then(function(troupes) {
          var t0 = troupes[0];
          assert(t0, 'troupe expected');
          assert(t0.id, 'troupe.id expected');
          return t0.id;
        });

    });
};

exports.userId = function() {
  return exports.token()
    .then(function(token) {
      return rest.get(BASE_URL + 'user', {
          headers: { Authorization: 'Bearer ' + token }
        })
        .then(function(users) {
          var u0 = users[0];
          assert(u0, 'user expected');
          assert(u0.id, 'user.id expected');
          return u0.id;
        });

    });
};

function wrapRest() {
  return ['get','post','put','del','head', 'json', 'postJson'].reduce(function(memo, method) {
    var underlying = rest[method];
    if(underlying) {

      memo[method] = function() {
        var args = Array.prototype.slice.apply(arguments);
        args[0] = BASE_URL + args[0];
        var index;
        if(method === 'json' || method == 'postJson') {
          index = 2;
        } else {
          index = 1;
        }
        while(args.length < index + 1) args.push(undefined);
        var opts = args[index];
        if(!opts) {
          opts = {};
          args[index] = opts;
        }
        var headers = opts.headers;
        if(!opts.headers) {
          headers = {};
          opts.headers = headers;
        }

        return exports.token()
          .then(function(token) {
            headers.Authorization = 'Bearer ' + token;
            return underlying.apply(rest, args);
          });
      };
    }

    return memo;
  }, {});
}

exports.testRest = wrapRest();

