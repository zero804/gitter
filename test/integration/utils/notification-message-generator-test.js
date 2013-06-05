/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var underTest = testRequire('./utils/notification-message-generator');
var _ = require('underscore');

describe('notification-message-generator', function() {
  it('should generate message for the simple case', function() {
    var text = underTest.generateNotificationMessage({ name: 'Souper Troupers' }, {
      'chat': [ { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} }]
    });

    assert.equal(text, 'Souper Troupers  \nMike: Yo');
  });

  it('should generate message for the simple file case', function() {
    var text = underTest.generateNotificationMessage({ name: 'Souper Troupers' }, {
      'file': [ { id: '00001', fileName: 'accounts.xls', latestVersion : { creatorUser: { displayName: 'Mike Bartlett '} } } ]
    });

    assert.equal(text, 'Souper Troupers  \nMike uploaded accounts.xls');
  });


  it('should generate message for the double file case', function() {
    var text = underTest.generateNotificationMessage({ name: 'Souper Troupers' }, {
      'file': [
                { id: '00001', fileName: 'accounts.xls', latestVersion : { creatorUser: { displayName: 'Mike Bartlett '} } },
                { id: '00002', fileName: 'ads.xls', latestVersion : { creatorUser: { displayName: 'Andrew Newdigate'} } }
              ]
    });

    assert.equal(text, 'Souper Troupers  \nMike uploaded accounts.xls  \nAndrew uploaded ads.xls');
  });

  it('should generate message for the double chat case', function() {
    var text = underTest.generateNotificationMessage({ name: 'Souper Troupers' }, {
      'chat': [
                { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} },
                { id: '00002', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
              ]
    });

    assert.equal(text, 'Souper Troupers  \nMike: Yo  \nAndrew: Hey how are you?');
  });


  it('should truncate really long lines', function() {
    var text = underTest.generateNotificationMessage({ name: 'Souper Troupers' }, {
      'chat': [
                { id: '00001', text: 'Hey I just wanted to run by those accounts figures with you', fromUser: { displayName: 'Mahershalalhashbaz Smith'} },
                { id: '00002', text: 'Why is your name so long?', fromUser: { displayName: 'Andrew Newdigate' } }
              ]
    });

    assert.equal(text, 'Souper Troupers  \nMahershalalhashbaz: Hey I ju…  \nAndrew: Why is your name so…');
  });

  it('should handle mixed content', function() {
    var text = underTest.generateNotificationMessage({ name: 'Souper Troupers' }, {
      'chat': [
                { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} },
                { id: '00003', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
              ],
      'file': [
                { id: '00002', fileName: 'accounts.xls', latestVersion : { creatorUser: { displayName: 'Mike Bartlett '} } },
                { id: '00004', fileName: 'ads.xls', latestVersion : { creatorUser: { displayName: 'Andrew Newdigate'} } }
              ]
    });

    assert.equal(text, 'Souper Troupers  \nMike: Yo  \nMike uploaded accounts.xls  \nAndrew: Hey how are you?  \nAndrew uploaded ads.xls');
  });

});