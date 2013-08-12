/*jshint unused:true, browser:true*/
require([
  'assert',
  'utils/mixpanel'
], function(assert, mixpanel) {

  describe("Mixpanel should load correctly", function() {

    it("add the first view", function() {
      assert(mixpanel, 'mixpanel should not be null');
      assert(mixpanel.init, 'mixpanel.init should not be null');

      mixpanel.init('***REMOVED***');
      assert(mixpanel.identify, 'mixpanel.identify should exist');
    });

  });

});