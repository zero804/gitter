/*jslint node: true */
/*global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');

var Fiber = testRequire("./utils/fiber");

var assert = require("better-assert");

// NOTE: on localhost this test will need to run with a larger mocha timeout (10s) which is done on command line with - t 10s
describe('Fiber', function() {
  describe('#sync()', function() {
    it('should wait for all waitor() promises before executing', function(done){
      var fiber = new Fiber(), firstCallbackHasRun, secondCallbackHasRun, syncCallbackHasRun;

      /* Setup synchronization */

      var firstWaitor = fiber.waitor();
      setTimeout(firstCallback, 12);

      var secondWaitor = fiber.waitor();
      setTimeout(secondCallback, 14);

      fiber.sync().then(syncCallback);

      /* Callbacks */

      function firstCallback() {
        assert(firstCallbackHasRun !== true);
        //assert(secondCallback !== true);
        assert(syncCallbackHasRun !== true);

        firstCallbackHasRun = true;

        return firstWaitor.apply(this, arguments);
      }

      function secondCallback() {
        //assert(firstCallbackHasRun === true);
        assert(secondCallbackHasRun !== true);
        assert(syncCallbackHasRun !== true);

        secondCallbackHasRun = true;

        return secondWaitor.apply(this, arguments);
      }

      function syncCallback() {
        assert(firstCallbackHasRun === true);
        assert(secondCallbackHasRun === true);
        assert(syncCallbackHasRun !== true);

        syncCallbackHasRun = true;

        done();
      }

    });
  });
});