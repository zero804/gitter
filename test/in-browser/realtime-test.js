/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'expect',
  'mocha',
  'components/realtime'
], function($, _, expect, mocha, realtime) {
  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });


  describe('realtime', function(){
    describe('.connect()', function(){
      xit('should be able to connect and disconnect many times', function(done) {

        var sub = realtime.subscribe('moo', function() { });

        sub.callback(function() {
          done();
        });
      });

    });

  });

  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});