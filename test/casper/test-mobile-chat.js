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

casper.start(baseUrl + "login", function() {

});

casper.then(function() {
  this.fill('form#loginform', {
    email: 'testuser@troupetester.local',
    password: '654321'
  }, true);
});

casper.thenOpen(baseUrl + 'testtroupe1', function() {
  casper.test.assert(casper.getTitle().indexOf('Test Troupe 1') >= 0);
});

casper.run();