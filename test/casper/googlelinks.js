var links = [];
var casper = require('casper').Casper({
    viewportSize: {width: 1280, height: 800},
    waitTimeout: 60000,
    verbose: true,
    logLevel: 'debug'
});
//var baseUrl = "http://mydigitalself.no-ip.org:5000/";
//var baseUrl = "https://beta.trou.pe/";
var baseUrl = "http://localhost:5000/";

casper.start(baseUrl + "x", function() {
});

casper.thenClick('.button-existing-users-login');

casper.then(function() {
  this.waitForSelector('#loginForm');
  this.fill('form#loginForm', {
    email: 'andrewn@datatribe.net',
    password: '111'
  });

  this.evaluate(function() {
    $('#loginForm').submit();
  });
});


casper.then(function() {
  this.waitForSelector('.trpNav');
  this.capture('loaded.png');
});

casper.run();
