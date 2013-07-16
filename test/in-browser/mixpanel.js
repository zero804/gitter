/*jshint unused:true, browser:true*/
require([
  'assert',
  'mocha',
  'utils/mixpanel'
], function(assert, mocha, mixpanel) {
  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

  describe("Mixpanel should load correctly", function() {

    it("add the first view", function() {
      assert(mixpanel, 'mixpanel should not be null');
      assert(mixpanel.init, 'mixpanel.init should not be null');

      mixpanel.init('***REMOVED***');
      assert(mixpanel.identify, 'mixpanel.identify should exist');
    });

  });

  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});