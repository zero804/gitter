#!/usr/bin/env mocha --ignore-leaks
"use strict";

var testRequire   = require('../test-require');
var Q             = require('q');
var assert        = require('assert');

var EMAIL_DATA = [
  {
    "troupe": {
      "id": "53d61acc1a1c8bd81c69ce23",
      "uri": "gitterHQ/gitter",
      "oneToOne": false,
      "userIds": [
        "53ce4c02d6d7c494a3f737a9",
        "53cf8aa8fe44f8028eb727fb",
        "54059cc35bc771454170a225"
      ],
      "url": "/gitterHQ/gitter",
      "urlUserMap": false,
      "nameUserMap": false
    },
    "unreadCount": 1,
    "unreadItems": [
      "5405bfdd66579b000004df1a"
    ],
    "chats": [
      {
        "id": "5405bfdd66579b000004df1a",
        "text": "GOOD STUFF",
        "html": "GOOD STUFF",
        "sent": "2014-09-02T13:02:21.343Z",
        "mentions": [],
        "fromUser": {
          "id": "53cf8aa8fe44f8028eb727fb",
          "username": "gitterawesome",
          "displayName": "gitterawesome",
          "avatarUrlSmall": "https://avatars.githubusercontent.com/u/7022301?v=2&s=60",
          "avatarUrlMedium": "https://avatars.githubusercontent.com/u/7022301?v=2&s=128"
        }
      },
      {
        "id": "5405bfdd66579b000004df1a",
        "text": "AWesome",
        "html": "AWesome",
        "sent": "2014-09-02T13:02:21.343Z",
        "mentions": [],
        "fromUser": {
          "id": "53cf8aa8fe44f8028eb727fb",
          "username": "gitterawesome",
          "displayName": "gitterawesome",
          "avatarUrlSmall": "https://avatars.githubusercontent.com/u/7022301?v=2&s=60",
          "avatarUrlMedium": "https://avatars.githubusercontent.com/u/7022301?v=2&s=128"
        }
      }
    ]
  }, {
        "troupe": {
          "id": "53d61acc1a1c8bd81c69ce23",
          "uri": "gitterHQ/nibbles",
          "oneToOne": false,
          "userIds": [
            "53ce4c02d6d7c494a3f737a9",
            "53cf8aa8fe44f8028eb727fb",
            "54059cc35bc771454170a225"
          ],
          "url": "/gitterHQ/gitter",
          "urlUserMap": false,
          "nameUserMap": false
        },
        "unreadCount": 50,
        "unreadItems": [
          "5405bfdd66579b000004df1a"
        ],
        "chats": [
          {
            "id": "5405bfdd66579b000004df1a",
            "text": "GOOD STUFF",
            "html": "GOOD STUFF",
            "sent": "2014-09-02T13:02:21.343Z",
            "mentions": [],
            "fromUser": {
              "id": "53cf8aa8fe44f8028eb727fb",
              "username": "gitterawesome",
              "displayName": "gitterawesome",
              "avatarUrlSmall": "https://avatars.githubusercontent.com/u/7022301?v=2&s=60",
              "avatarUrlMedium": "https://avatars.githubusercontent.com/u/7022301?v=2&s=128"
            }
          },
          {
            "id": "5405bfdd66579b000004df1a",
            "text": "AWesome",
            "html": "AWesome",
            "sent": "2014-09-02T13:02:21.343Z",
            "mentions": [],
            "fromUser": {
              "id": "53cf8aa8fe44f8028eb727fb",
              "username": "gitterawesome",
              "displayName": "gitterawesome",
              "avatarUrlSmall": "https://avatars.githubusercontent.com/u/7022301?v=2&s=60",
              "avatarUrlMedium": "https://avatars.githubusercontent.com/u/7022301?v=2&s=128"
            }
          }
        ]
  }
];


describe('email-notification-service', function() {
  var emailNotificationService;

  beforeEach(function() {
    emailNotificationService = testRequire.withProxies("./services/email-notification-service", {
      './email-address-service': function() {
        return Q.resolve('mike.bartlett@gmail.com');
      }
    });
  });
  it('should send emails about unread items', function(done) {
    var user = {};

    return emailNotificationService.sendUnreadItemsNotification(user, EMAIL_DATA)
      .nodeify(done);
  });

  it('should generate nice subject lines', function() {
    // One room
    var subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        uri: 'gitterHQ'
      }
    }]);

    assert.equal('Unread messages in gitterHQ', subject);

    // Two rooms
    subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        uri: 'gitterHQ'
      }
    }, {
      troupe: {
        uri: 'troupe'
      }
    }]);

    assert.equal('Unread messages in gitterHQ and troupe', subject);

    // One user, one troupe
    subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        oneToOne: true,
        user: {
          username: 'suprememoocow'
        }
      }
    }, {
      troupe: {
        uri: 'troupe'
      }
    }]);

    assert.equal('Unread messages in suprememoocow and troupe', subject);

    // One user
    subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        oneToOne: true,
        user: {
          username: 'suprememoocow'
        }
      }
    }]);

    assert.equal('Unread messages from suprememoocow', subject);

    // Three user s
    subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        uri: 'troupe'
      }
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'mydigitalshelf'
        }
      },
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'trevorah'
        }
      }
    }]);

    assert.equal('Unread messages in troupe, mydigitalshelf and one other', subject);

    // two rooms one user
    subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        oneToOne: true,
        user: {
          username: 'suprememoocow'
        }
      },
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'mydigitalshelf'
        }
      },
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'trevorah'
        }
      }
    }]);

    assert.equal('Unread messages from suprememoocow, mydigitalshelf and one other', subject);


    // Four user s
    subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        uri: 'troupe'
      }
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'mydigitalshelf'
        }
      },
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'trevorah'
        }
      }
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'walter'
        }
      }
    }]);

    assert.equal('Unread messages in troupe, mydigitalshelf and 2 others', subject);

    // Three user s
    subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail([{
      troupe: {
        uri: 'this_is_a_very_long_org/with_a_very_long_repo/and_then_a_channel'
      }
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'mydigitalshelf'
        }
      },
    }, {
      troupe: {
        oneToOne: true,
        user: {
          username: 'trevorah'
        }
      }
    }]);

    assert.equal('Unread messages in and_then_a_channel, mydigitalshelf and one other', subject);

  });
});
