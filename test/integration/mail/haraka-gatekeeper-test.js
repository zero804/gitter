/*jslint node: true */
/*global describe: true it: true */
"use strict";

global.DENYSOFT = "DENYSOFT";
global.DENY = "DENY";
global.OK = "OK";
global.CONT = "CONT";

var assert = require("better-assert");
var proxyquire = require("proxyquire").noCallThru();
var Address = require("./address").Address;
var sinon = require("sinon");

describe('haraka-gatekeeper', function() {

  var registeredFromAddress = 'testuser@troupetester.local';
  var unregisteredFromAddress = 'unregistered-user@troupetester.local';
  var permittedTroupeUri = 'testtroupe1';
  var forbiddenTroupeUri =  'testtroupe2';
  var nonExistantTroupeUri = 'nonexistant1234';

  describe('#hook_queue()', function() {

    /*
    *
    */
    it('should accept and send bounce if the sending user is not registered on troupe', function(done){

      var sendEmailProxy = createEmailProxy();
      var gatekeeper = createGatekeeperPlugin(sendEmailProxy);
      var connection = createConnection(
        unregisteredFromAddress,
        [new Address(permittedTroupeUri, "trou.pe")],
        "Testing a send from an unregistered user"
      );

      gatekeeper.hook_queue(nextCallback, connection);

      function nextCallback(code, message) {

        // check that the mail was accepted
        assert(code == global.OK);
        // check that a bounce mail was sent
        assert (sendEmailProxy.called);

        done();
      }

    });

    /*
    *
    */
    it('should accept the mail for registered troupe users, ' +
      ' sending no bounce mail for an existing troupe that the user is a member of', function(done){

      var sendEmailProxy = createEmailProxy();
      var gatekeeper = createGatekeeperPlugin(sendEmailProxy);
      var connection = createConnection(
        registeredFromAddress,
        [new Address(permittedTroupeUri, "trou.pe")],
        "Testing a valid send to one troupe"
      );

      function nextCallback(code, message) {
        // check that the next plugin will run
        assert(code == global.CONT);
        // check rcpt_to header has (not) been adjusted
        assert(connection.transaction.rcpt_to.length == 1);
        // check that no bounce mail was sent
        assert(sendEmailProxy.called === false);

        done();
      }

      gatekeeper.hook_queue(nextCallback, connection);
    });

    /*
    *
    */
    it('should accept the mail from registered user, ' +
        ' and send only one bounce mail if any troupe is forbidden or non existant, ' +
        ' removing those addresses from recipient list for next plugins' +
        ' while keeping the valid troupe on the recipient list', function(done){

      var sendEmailProxy = createEmailProxy();
      var gatekeeper = createGatekeeperPlugin(sendEmailProxy);
      var connection = createConnection(
        registeredFromAddress,
        [new Address(nonExistantTroupeUri,"trou.pe"), new Address(permittedTroupeUri,"trou.pe")],
        "Testing a send from an unregistered user"
      );

      gatekeeper.hook_queue(nextCallback, connection);

      function nextCallback(code, message) {
        assert(code == global.CONT);
        console.log('rcpt_to length is ' + connection.transaction.rcpt_to.length);
        assert(connection.transaction.rcpt_to.length == 1);
        assert(sendEmailProxy.calledOnce);
        done();
      }

    });
  });

  // creates an haraka connection object, accepts in an array of Address objects for toAddresses.
  function createConnection(from, toAddresses, subject) {
    return {
      transaction: {
        mail_from: from,
        rcpt_to: toAddresses,
        header: {
          "Subject": subject,
          "Date": (new Date()).toString(),
          get: function(name) { return this[name]; }
        }
      }
    };
  }

  // creates a mock of the gatekeeper plugin, bypassing the sending of the bounce mail
  function createGatekeeperPlugin(sendEmailProxy) {

    var gatekeeper = proxyquire("../../../haraka/plugins/gatekeeper", {
      './../../server/services/mailer-service': {
        sendEmail: sendEmailProxy
      }
    });

    return gatekeeper;
  }

  // create one of these and pass in when creating gatekeeper
  function createEmailProxy() {
    return sinon.spy();
  }
});

