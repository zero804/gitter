/*jshint unused:true, browser:true*/
define(['jquery', 'underscore', 'expect', 'components/realtime'], function($, _, expect, realtime) {
  describe('realtime', function() {
    describe('.connect()', function() {
      xit('should be able to connect and disconnect many times', function(done) {
        var sub = realtime.subscribe('moo', function() {});

        sub.callback(function() {
          done();
        });
      });
    });
  });
});
