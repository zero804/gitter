"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var underTest = testRequire('./services/notifications/notification-message-generator');

describe('notification-message-generator', function() {
  it('should generate message for the simple case', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [ { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} }]);

    assert.equal(message, 'gitterHQ/gitter-webapp  \nMike: Yo');
  });

  it('should generate a message for a one to one', function() {
    var troupe = {
      "id": "5395a3c7ade1b7aa68a08e6d",
      "name": "Andy Trevorah",
      "oneToOne": true,
      "userIds": ["535f8372096160afe0362eba","538f52b7ade1b7aa68a08e68"],
      "url": "/trevorah"
    };
    var items = [{
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
    }];
    // var smsLink = "http://localhost:5000/trevorah";

    var message = underTest(troupe, items);

    assert.equal(message, 'Andy Trevorah  \ntest message');
  });

  it('should generate message for the double chat case', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: 'Yo', fromUser: { displayName: 'Mike Bartlett '} },
      { id: '00002', text: 'Hey how are you?', fromUser: { displayName: 'Andrew Newdigate' } }
    ]);

    assert.equal(message, 'gitterHQ/gitter-webapp  \nMike: Yo  \nAndrew: Hey how are you?');
  });


  it('should truncate really long lines', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
      { id: '00001', text: 'Hey I just wanted to run by those accounts figures with you', fromUser: { displayName: 'Mahershalalhashbaz Smith'} },
      { id: '00002', text: 'Why is your name so long?', fromUser: { displayName: 'Andrew Newdigate' } }
    ]);

    assert.equal(message, 'gitterHQ/gitter-webapp  \nMahershalalhashbaz: Hey I ju…  \nAndrew: Why is your name so…');
  });


  it('should handle really long content', function() {
    var message = underTest({ uri: 'gitterHQ/gitter-webapp' }, [
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
    ]);
    console.dir(message);
    console.dir('gitterHQ/gitter-webapp  \nMike: Yo  \nAndrew: Hey how are you?');
    assert.equal(message, 'gitterHQ/gitter-webapp  \nMike: Yo  \nAndrew: Hey how are you?  \nAndrew: Hey how are you?');
  });


});
