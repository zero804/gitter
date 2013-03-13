/*jshint unused:true, browser:true, globalstrict:true*/
/*global require:true */
"use strict";

// we need to be able to login with a test user (testuser@troupetest.local, password: 654321) that exists
// navigate to the troupe (url: testtroupe1, name: Test Troupe 1)
// check for errors.

var casperJS = require('casper');
var casper = new casperJS.Casper({
  viewportSize: { width: 1280, height: 800 },
  waitTimeout: 60000,
  verbose: true,
  logLevel: 'debug'
});

var baseUrl = casper.cli.get('url');
if(!baseUrl) {
  baseUrl = "http://localhost:5000/";
}

casper.test.comment('Mobile chat test');


casper.userAgent("Casper Mobile");

// navigate to the login page
casper.start(baseUrl + "login", function() {

});

// send the login form
casper.then(function() {
  this.fill('form#loginform', {
    email: 'testuser@troupetest.local',
    password: '654321'
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
  casper.waitForSelector('#chat-input-textarea');
  // will casper fail if the page sends out an uncaught exception?
});

casper.run();