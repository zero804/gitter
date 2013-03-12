/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var restSerializer = require('../../server/serializers/rest-serializer');

var assert = require("better-assert");

describe('restSerializer', function() {
  describe('#reverseGeocode()', function() {
    it('should return Oral for 50,50', function(done){
      var strategy = new restSerializer.UserStrategy();
      var users = [{
      }];
      restSerializer.serialize(users, strategy, function(err, serialized) {
        if(err) return done(err);
        done();
      });
    });

  });
});
