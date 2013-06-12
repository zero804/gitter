/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'expect',
  'mocha'
], function($, _, expect, mocha) {
  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

  function FayeMock() {
    console.log('FAYE MOCK');
  }


  describe('realtime', function(){
    describe('.connect()', function(){
      it('should be able to connect and disconnect many times', function(done) {

        var realtime = testr('components/realtime', {
          'Faye': FayeMock
        });

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