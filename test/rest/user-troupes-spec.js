/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true */
"use strict";

var assert = require('assert');
var restUtils = require('./rest-utils');
var testRest = restUtils.testRest;
var userId;

before(function(done) {
  return restUtils.userId()
    .then(function(puserId) {
      userId = puserId;
    })
    .nodeify(done);
});


describe('/user/:id/troupes', function() {

  it('should index', function(done) {
    return testRest.get('user/' + userId + '/troupes')
      .then(function(troupes) {
        assert(Array.isArray(troupes));
      })
      .nodeify(done);
  });


  it('should show', function(done) {
    return testRest.get('user/' + userId + '/troupes')
      .then(function(troupes) {
        var troupe = troupes[0];
        return testRest.get('user/' + userId + '/troupes/' + troupe.id);
      })
      .then(function(troupe) {
        assert(troupe.id, 'expected an id');
        assert(troupe.url, 'expected a url');
      })
      .nodeify(done);
  });


});


