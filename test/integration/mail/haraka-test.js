/*jslint node: true */
/*global describe: true it: true */
"use strict";

global.DENYSOFT = "DENYSOFT";
global.DENY = "DENY";
global.OK = "OK";
global.CONT = "CONT";

var testRequire = require('../test-require');

var assert = require("better-assert");
var Address = require("./address").Address;
var sinon = require("sinon");


describe('haraka', function() {


  var registeredFromAddress = 'testuser@troupetest.local';
  var unregisteredFromAddress = 'unregistered-user@troupetest.local';
  var permittedTroupeUri = 'testtroupe1';
  var forbiddenTroupeUri =  'testtroupe2';
  var nonExistantTroupeUri = 'nonexistant1234';

  var connection = createConnection(
    registeredFromAddress,
    [new Address(permittedTroupeUri, "trou.pe")],
    "Testing a valid send"
  );

  /*
  *
  */
  it('remailer should send the mail and store messageIds in the transaction', function(done){

    var sendEmailCalled = 0;
    var sendEmailProxy = function(from, recpts, stream, callback) {
      sendEmailCalled++;
      callback(null, ['msgId']);
    };

    var remailer = createRemailerPlugin(sendEmailProxy);


    remailer.hook_queue(nextCallback, connection);

    function nextCallback(code, message) {

      // check that the mail was accepted
      assert(code == global.CONT);
      // check that ses was called
      assert (sendEmailCalled === 1);
      // check that there is a message id in the transaction
      assert(connection.transaction.notes.messageIdsByTroupe);

      done();
    }

  });

  /*
  *
  */
  it('persister should store the mail in the correct conversation', function(done){

    var storeEmailInConversationCalled = 0;
    var storeEmailInConversation = function(mail, callback) {
      storeEmailInConversationCalled++;

      // check that the mail parameters are as expected
      assert(mail.messageIds[0] === 'msgId');

      callback();
    };

    var persister = createPersisterPlugin(storeEmailInConversation);

    function nextCallback(code, message) {
      // check that the mail processing was completed and accepted
      assert(code == global.OK);
      // check that the message stored
      console.log("store email proxy called: ", storeEmailInConversationCalled);
      assert(storeEmailInConversationCalled >= 1);

      done();
    }

    persister.hook_queue(nextCallback, connection);

  });


  // creates an haraka connection object, accepts in an array of Address objects for toAddresses.
  function createConnection(from, toAddresses, subject) {
    return {
      transaction: {
        mail_from: from,
        rcpt_to: toAddresses,
        notes: {},
        message_stream: {
          pipe: function(to) {
            // this is done by the MailParser instead
          }
        },
        header: {
          "Subject": subject,
          "Date": (new Date()).toString(),
          "In-Reply-To": '',
          get: function(name) { return this[name]; },
        },
        remove_header: function(name) { delete this.header[name]; },
        add_header: function(name, value) { this.header[name] = value; }
      },
      logdebug: function() {}
    };
  }

  // creates a mock of the plugin, bypassing the sending of the mail
  function createRemailerPlugin(sendEmailProxy) {

    var plugin = testRequire.withProxies("./haraka/plugins/remailer", {
      './utils/mail/troupe-ses-transport': {
        sendMailStream: sendEmailProxy
      }
    }, true);

    return plugin;
  }

  // creates a mock of the plugin, intercepting the storage of the mail
  function createPersisterPlugin(storeEmailInConversation) {

    var plugin = testRequire.withProxies("./haraka/plugins/persister", {
      './services/conversation-service': {
        storeEmailInConversation: storeEmailInConversation
      },
      'mailparser': {
        MailParser: function() {
          this.on = function(ev, callback) {
            // note: this will exec in a slightly diff order to the actual code
            callback({ attachments: [] });
          }
        }
      }
    }, true);

    return plugin;
  }

  // create one of these and pass in when creating gatekeeper
  function createSpy() {
    return sinon.spy();
  }
});

