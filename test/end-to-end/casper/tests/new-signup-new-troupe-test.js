/*jshint unused:true, browser:true, globalstrict:true*/
/*global casper:true, console:true, $:true */
"use strict";

var baseUrl = casper.cli.get('url') || "http://localhost:5000/";

casper.test.begin('New signup for a new troupe', 1, function(test) {

  casper.onError = function() {
    console.log('onError');
  };

  var email = "test-" + Math.random() + "@troupetest.local";
  var troupeName = "New Signup New Troupe";

  casper.start(baseUrl + "x");

  casper.waitForSelector('#button-signup');

  casper.thenClick('#button-signup');

  casper.waitForSelector('#signup-form');
  casper.then(function() {
    this.fill('#signup-form', {
      troupeName: troupeName,
      email: email
    }, true);
  });

  casper.then(function() {
    casper.evaluate(function(baseUrl, forEmail) {
      console.log("Getting confirmation code...");

      $.post(baseUrl + 'confirmationCodeForEmail', { email: forEmail })
        .done(function(response, status, xhr) {
          console.log("status: ", status, " response: ", response, " code: ", xhr.statusCode());
          window.location = '/confirm/' + response.confirmationCode;
        })
        .fail(function(xhr, text, e) {
          console.log("error getting code: ", text, ", e: ", e, " body: ", xhr.responseText);
        });

    }, baseUrl, email);


  });

  casper.waitForSelector('.trpLeftMenu', function() {
    test.assert(true, "Page loaded");
  });

  casper.run();
});