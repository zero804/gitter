#!/usr/bin/env mocha --ignore-leaks

/*jslint node:true, unused:true*/
/*global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');

var troupeDemolitionService = testRequire("./services/troupe-demolition-service");


describe('troupe-demolition-service', function() {

  describe('#deleteEligibleTroupes()', function() {

    it('should delete old troupes', function(done) {
      troupeDemolitionService.deleteEligibleTroupes(function(err, count) {
        if(err) done(err);
        done();
      });

    });
  });

});