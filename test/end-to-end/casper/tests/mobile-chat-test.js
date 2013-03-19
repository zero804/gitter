/*jshint unused:true, browser:true, globalstrict:true*/
/*global casper:true */
"use strict";

var baseUrl = casper.cli.get('url') || "http://localhost:5000/";

casper.test.begin('Mobile chat', 1, function(test) {
  casper.onError = function() {
    test.fail('Error');
  };

  casper.userAgent("Casper Mobile");

  // navigate to the login page
  casper.start(baseUrl + "login");

  casper.waitForSelector('form#loginForm');

  // send the login form
  casper.then(function() {
    this.fill('form#loginform', {
      email: 'testuser@troupetest.local',
      password: '123456'
    }, true);
  });

  casper.then(function() {
    // wait for non mobile version of the default troupe to load
    casper.waitForResource('/testtroupe1');
  });

  // ERR the chat page is never navigated to, casper waits infinitely on the default troupe page

  // navigate to a test troupe chat page
  casper.thenOpen(baseUrl + 'testtroupe1/chat', function() {
    // ensure the troupe has been loaded
    // will casper fail if the page sends out an uncaught exception?
  });

  casper.waitForSelector('#chat-input-textarea', function() {
    test.assert(true, "Input area displayed");
  });

  casper.run(function() {
    test.done();
  });

});