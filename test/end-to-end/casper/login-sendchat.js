var links = [];
var casper = require('casper').Casper({
    viewportSize: {width: 1280, height: 800},
    waitTimeout: 60000,
    verbose: true,
    logLevel: 'debug'
});
var baseUrl = "http://localhost:5000/";

casper.start(baseUrl + "x", function() {
});

casper.thenClick('#button-existing-users-login');

casper.then(function() {
  this.fill('form#loginForm', {
    email: 'tim@troupe.co',
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
    this.capture('waiting.png');

    return this.evaluate(function(magicText) {
        return _.some($('.trpChatText'), function(i) { console.log($(i).text().indexOf(magicText)); return $(i).text().indexOf(magicText) >= 0; });
    }, magicText);
}, function then() {
  console.log("Discovered magic text");
});

casper.run();
