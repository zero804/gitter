// we need to be able to login with a test user (testuser@troupetester.local, password: 654321) that exists
// navigate to the troupe (url: testtroupe1, name: Test Troupe 1)
// check for errors.

var casperJS = require('casper');

var casper = casperJS.Casper({
    viewportSize: {width: 1280, height: 800},
    waitTimeout: 60000,
    verbose: true,
    logLevel: 'debug'
});

var baseUrl = "http://localhost:5000/";

casper.userAgent("Casper Mobile");

// navigate to the login page
casper.start(baseUrl + "login", function() {

});

// send the login form
casper.then(function() {
  this.fill('form#loginform', {
    email: 'testuser@troupetester.local',
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