/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true */
"use strict";

var rest = require('restler-q');
var assert = require('assert');
var Q = require('q');
var restUtils = require('./rest-utils');
var BASE_URL = 'http://localhost:5000/';
var token;
var troupeId;
var userId;

before(function(done) {
  Q.all([
      restUtils.token(),
      restUtils.troupeId(),
      restUtils.userId(),
    ])
    .spread(function(ptoken, ptroupeId, puserId) {
      token = ptoken;
      troupeId = ptroupeId;
      userId = puserId;
    })
    .nodeify(done);
});


describe('/user', function() {
  it('should index', function(done) {
    return rest.get(BASE_URL + 'user', {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(users) {
        assert(Array.isArray(users));
        assert.equal(users.length, 1);

        var u0 = users[0];
        assert(u0.id);
      })
      .nodeify(done);
  });

  it('should show', function(done) {
    return rest.get(BASE_URL + 'user/' + userId, {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(user) {
        assert(user.id,'expected an id');
        assert(user.url, 'expected a url');
        assert(user.avatarUrlSmall, 'expected a small avatar');
        assert(user.avatarUrlMedium, 'expected a medium avatar');
      })
      .nodeify(done);
  });


});


