/*jslint node:true */
/*global describe:true, it:true */
"use strict";

var geocodingService = require('../../../server/services/geocoding-service');

var assert = require("better-assert");

describe('geocodingService', function() {
  describe('#reverseGeocode()', function() {
    it('should return Oral for 50,50', function(done){

      geocodingService.reverseGeocode({ lon: 50, lat: 50}, function(err, value) {
        if(err) return done(err);

        assert(value === null);
        done();
      });
    });

    it('should return Kew Gardens for TW92EB', function(done){
      geocodingService.reverseGeocode({ lon: -0.2891748, lat: 51.4705169}, function(err, value) {
        if(err) return done(err);

        assert(value !== null);
        assert('Kew Gardens' == value.name);
        done();
      });
    });

    it('should return London for NW24DX', function(done){
      geocodingService.reverseGeocode({ lon: -0.2144102, lat: 51.5502856}, function(err, value) {
        if(err) return done(err);

        assert(value !== null);
        assert('Cricklewood' == value.name);
        done();
      });
    });

    it('should return Walworth for SE59LN', function(done){
      geocodingService.reverseGeocode({ lon: -0.1020459, lat: 51.4754752}, function(err, value) {
        if(err) return done(err);

        assert(value !== null);
        assert('Walworth' == value.name);
        done();
      });
    });

    it('should return Canary Wharf for E144BB', function(done){
      geocodingService.reverseGeocode({ lon: -0.0219333, lat: 51.5046467}, function(err, value) {
        if(err) return done(err);

        assert(value !== null);
        assert('Canary Wharf' == value.name);
        done();
      });
    });

  });
});
