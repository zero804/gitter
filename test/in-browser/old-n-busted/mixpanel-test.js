/*jshint unused:true, browser:true*/

var mixpanel = require('../../../public/js/utils/mixpanel');


describe("Mixpanel should load correctly", function() {

  it("add the first view", function() {
    assert(mixpanel, 'mixpanel should not be null');
    assert(mixpanel.init, 'mixpanel.init should not be null');

    mixpanel.init('***REMOVED***');
    assert(mixpanel.identify, 'mixpanel.identify should exist');
  });

});
