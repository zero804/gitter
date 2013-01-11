/*jslint node: true */
/*global describe: true it: true */
"use strict";

describe('haraka-gatekeeper', function() {
  describe('#hook_queue()', function() {

    it('should ONLY hard deny if the sending user is not registered on troupe', function(){
      return true;
    });

    it('should send one bounce mail for any forbidden or non existant troupe addresses', function() {
      return true;
    });

  });
});
