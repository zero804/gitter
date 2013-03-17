/*jshint unused:true, browser:true, globalstrict:true*/
/*global jQuery:true, _:true, $:true, casper:true, console:true */
"use strict";

var baseUrl = casper.cli.get('url') || "http://localhost:5000/";

casper.test.begin('Send a chat to a troupe', 1, function(test) {

  casper.onError = function() {
    test.fail('Error');
  };

  casper.start(baseUrl + "x");

  casper.waitForSelector('#button-existing-users-login');
  casper.thenClick('#button-existing-users-login');

  casper.waitForSelector('form#loginForm');
  casper.then(function() {
    this.fill('form#loginForm', {
      email: 'testuser@troupetest.local',
      password: '123456'
    }, true);
  });


  var magicText = 'Random' + Math.random();

  casper.waitForSelector('.trpChatInputBoxTextArea');
  casper.thenClick('.trpChatInputBoxTextArea', function() {
    this.sendKeys('.trpChatInputBoxTextArea', magicText);

    casper.evaluate(function triggerKeyDownEvent() {
      var e = jQuery.Event("keydown");
      e.which = 13;
      e.keyCode = 13;
      jQuery(".trpChatInputBoxTextArea").trigger(e);
    });
  });

  casper.waitFor(function check() {
      return this.evaluate(function(magicText) {

        return _.some($('.trpChatText'), function(i) {
          return $(i).text().indexOf(magicText) >= 0;
        });

      }, magicText);

  }, function then() {
    test.assert(true, "Chat published");
  });

  casper.run(function() {
    test.done();
  });


});



