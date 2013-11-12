/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true */
"use strict";

var assert = require('assert');
var restUtils = require('./rest-utils');
var testRest = restUtils.testRest;
var userId;
var troupeId;

before(function(done) {
  return restUtils.userId()
    .then(function(puserId) {
      userId = puserId;

      return testRest.get('/user/' + userId + '/troupes');
    })
    .then(function(troupes) {
      var troupe = troupes[0];
      troupeId = troupe.id;
    })
    .nodeify(done);
});


describe('/user/:id/troupes/:id/settings', function() {

  it('should index', function(done) {
    return testRest.get('/user/' + userId + '/troupes/' + troupeId + '/settings')
      .then(function(settings) {
        assert(settings);
      })
      .nodeify(done);
  });

  it('should update and show', function(done) {
    return testRest.put('/user/' + userId + '/troupes/' + troupeId + '/settings/test', {
        data: JSON.stringify({ value: 1 }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(function() {
        return testRest.get('/user/' + userId + '/troupes/' + troupeId + '/settings/test');
      })
      .then(function(settings) {
        assert(settings);
      })
      .nodeify(done);
  });



});


