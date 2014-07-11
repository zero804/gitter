/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var underTest = testRequire('./utils/notification-message-generator');
var _ = require('underscore');

describe('notification-message-generator', function() {
  it('should generate message for the simple case', function() {
    var message = underTest.generateNotificationMessage({ uri: 'gitterHQ/gitter-webapp' }, {
      'chat': [ { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} }]
    }, 'http://localhost/test');

    assert.equal(message.notificationText, 'gitterHQ/gitter-webapp  \nMike: Yo');
    assert.equal(message.smsText, 'gitterHQ/gitter-webapp\nMike: Yo\nhttp://localhost/test');
  });

  it('should generate a message for a one to one', function() {
    var troupe = {
      "id": "5395a3c7ade1b7aa68a08e6d",
      "name": "Andy Trevorah",
      "oneToOne": true,
      "userIds": ["535f8372096160afe0362eba","538f52b7ade1b7aa68a08e68"],
      "url": "/trevorah"
    };
    var items = {
      "chat": [{
        "id": "53b68c9b11e679b683873e12",
        "text": "test message",
        "sent": "2014-07-04T11:14:35.188Z",
        "mentions": [],
        "fromUser": {
          "id": "535f8372096160afe0362eba",
          "username": "trevorah",
          "displayName": "Andy Trevorah"
        },
        "troupe": false
      }]
    };
    var smsLink = "http://localhost:5000/trevorah";

    var message = underTest.generateNotificationMessage(troupe, items, smsLink);

    assert.equal(message.notificationText, 'Andy Trevorah  \nAndy: test message');
    assert.equal(message.smsText, 'Andy Trevorah\nAndy: test message\nhttp://localhost:5000/trevorah');
  });

  it('should generate message for the simple file case', function() {
    var message = underTest.generateNotificationMessage({ uri: 'gitterHQ/gitter-webapp' }, {
      'file': [ { id: '00001', fileName: 'accounts.xls', latestVersion : { creatorUser: { displayName: 'Mike Bartlett '} } } ]
    });

    assert.equal(message.notificationText, 'gitterHQ/gitter-webapp  \nMike uploaded accounts.xls');
    assert.equal(message.smsText, 'gitterHQ/gitter-webapp\nMike uploaded accounts.xls');
  });


  it('should generate message for the double file case', function() {
    var message = underTest.generateNotificationMessage({ uri: 'gitterHQ/gitter-webapp' }, {
      'file': [
                { id: '00001', fileName: 'accounts.xls', latestVersion : { creatorUser: { displayName: 'Mike Bartlett '} } },
                { id: '00002', fileName: 'ads.xls', latestVersion : { creatorUser: { displayName: 'Andrew Newdigate'} } }
              ]
    });

    assert.equal(message.notificationText, 'gitterHQ/gitter-webapp  \nMike uploaded accounts.xls  \nAndrew uploaded ads.xls');
    assert.equal(message.smsText, 'gitterHQ/gitter-webapp\nMike uploaded accounts.xls\nAndrew uploaded ads.xls');
  });

  it('should generate message for the double chat case', function() {
    var message = underTest.generateNotificationMessage({ uri: 'gitterHQ/gitter-webapp' }, {
      'chat': [
                { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} },
                { id: '00002', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
              ]
    });

    assert.equal(message.notificationText, 'gitterHQ/gitter-webapp  \nMike: Yo  \nAndrew: Hey how are you?');
  });


  it('should truncate really long lines', function() {
    var message = underTest.generateNotificationMessage({ uri: 'gitterHQ/gitter-webapp' }, {
      'chat': [
                { id: '00001', text: 'Hey I just wanted to run by those accounts figures with you', fromUser: { displayName: 'Mahershalalhashbaz Smith'} },
                { id: '00002', text: 'Why is your name so long?', fromUser: { displayName: 'Andrew Newdigate' } }
              ]
    });

    assert.equal(message.notificationText, 'gitterHQ/gitter-webapp  \nMahershalalhashbaz: Hey I ju…  \nAndrew: Why is your name so…');
  });

  it('should handle mixed content', function() {
    var message = underTest.generateNotificationMessage({ uri: 'gitterHQ/gitter-webapp' }, {
      'chat': [
                { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} },
                { id: '00003', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
              ],
      'file': [
                { id: '00002', fileName: 'accounts.xls', latestVersion : { creatorUser: { displayName: 'Mike Bartlett '} } },
                { id: '00004', fileName: 'ads.xls', latestVersion : { creatorUser: { displayName: 'Andrew Newdigate'} } }
              ]
    });

    assert.equal(message.notificationText, 'gitterHQ/gitter-webapp  \nMike: Yo  \nMike uploaded accounts.xls  \nAndrew: Hey how are you?  \nAndrew uploaded ads.xls');
  });

  it('should handle really long content', function() {
    var message = underTest.generateNotificationMessage({ uri: 'gitterHQ/gitter-webapp' }, {
      'chat': [
                { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} },
                { id: '00003', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00005', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00006', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00007', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00008', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00009', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00010', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00011', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00012', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00013', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00014', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } } ,
                { id: '00015', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
              ],
      'file': [
                { id: '00002', fileName: 'accounts.xls', latestVersion : { creatorUser: { displayName: 'Mike Bartlett '} } },
                { id: '00004', fileName: 'ads.xls', latestVersion : { creatorUser: { displayName: 'Andrew Newdigate'} } }
              ]
    }, 'http://localhost/test');

    assert.equal(message.notificationText, 'gitterHQ/gitter-webapp  \nMike: Yo  \nMike uploaded accounts.xls  \nAndrew: Hey how are you?  \nAndrew uploaded ads.xls');
    assert.equal(message.smsText, 'gitterHQ/gitter-webapp\nMike: Yo\nMike uploaded accounts.xls\nAndrew: Hey how are you?\nAndrew uploaded ads.xls\nAndrew: Hey how are you?\nhttp://localhost/test');

  });


});