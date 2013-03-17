/*jshint unused:true, browser:true, globalstrict:true*/
/*global casper:true, console:true, $:true */
"use strict";

var baseUrl = casper.cli.get('url') || "http://localhost:5000/";

casper.test.begin('Login and access a troupe', 1, function(test) {

  test.comment('Opening login page');

  // navigate to the login page
  casper.start(baseUrl + "login", function() {
    test.comment('Opening login page');
  });

  casper.waitForSelector('form#loginForm', function() {
    test.comment('Filling login form');

    this.fill('form#loginform', {
      email: 'testuser@troupetest.local',
      password: '123456'
    }, true);
  });

  casper.waitForSelector('.trpChatInputBoxTextArea', function() {
    test.assert(true, 'Loaded');
  });

  casper.run();
});