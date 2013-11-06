/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true */
"use strict";

var rest = require('restler-q');
var assert = require('assert');
var Q = require('q');
var restUtils = require('./rest-utils');
var BASE_URL = 'http://localhost:5000/';
var token;
var userId;

before(function(done) {
  Q.all([
      restUtils.token(),
      restUtils.userId(),
    ])
    .spread(function(ptoken, puserId) {
      token = ptoken;
      userId = puserId;
    })
    .nodeify(done);
});


describe('/user/:id/invites', function() {

  it('should index', function(done) {
    return rest.get(BASE_URL + 'user/' + userId + '/invites', {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(invites) {
        assert(Array.isArray(invites));
      })
      .nodeify(done);
  });

});


