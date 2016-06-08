"use strict";

var testRequire = require('../test-require');
var Promise = require('bluebird');
var assert = require('assert');
var i18nFactory = testRequire('./utils/i18n-factory');

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
  var lang;

  beforeEach(function() {
    emailNotificationService = testRequire.withProxies("./services/email-notification-service", {
      './email-address-service': function() {
        return Promise.resolve('mike.bartlett@gmail.com');
      },
      './user-settings-service': {
        getUserSettings: function(userId, key) {
          assert(userId);
          assert.strictEqual(key, 'lang');
          return Promise.resolve(lang);
        }
      }
    });
  });

  it.skip('should send emails about unread items #slow', function(done) {
    this.timeout(30000);
    var user = { id: "5405bfdd66579b000004df1a" };

    return emailNotificationService.sendUnreadItemsNotification(user, EMAIL_DATA)
      .nodeify(done);
  });

  it.skip('should send emails about unread items in spanish  #slow', function(done) {
    this.timeout(30000);

    lang = 'es';
    var user = { id: "5405bfdd66579b000004df1a" };

    return emailNotificationService.sendUnreadItemsNotification(user, EMAIL_DATA)
      .nodeify(done);
  });


  describe('subjects', function() {
    var FIXTURE_ODD = [{
        troupe: {
          uri: 'gitterHQ'
        }
      }];
    var FIXTURE_TWO_ROOMS = [{
        troupe: {
          uri: 'gitterHQ'
        }
      }, {
        troupe: {
          uri: 'troupe'
        }
      }];

    var FIXTURE_ONE_USER_ONE_ROOM = [{
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
      }];

    var FIXTURE_ONE_USER = [{
        troupe: {
          oneToOne: true,
          user: {
            username: 'suprememoocow'
          }
        }
      }];

    var FIXTURE_TWO_USERS = [{
        troupe: {
          oneToOne: true,
          user: {
            username: 'suprememoocow'
          }
        }
      }, {
        troupe: {
          oneToOne: true,
          user: {
            username: 'billybob'
          }
        }
      }];

    var FIXTURE_THREE_USERS = [{
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
      }];

    var FIXTURE_TWO_ROOMS_ONE_USER = [{
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
      }];

    var FIXTURE_FOUR_USERS = [{
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
      }];

    var FIXTURE_THREE_MIXTURE = [{
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
      }];

    it('should generate nice subject lines', function() {
      var i18n = i18nFactory.get();

      // One room
      var subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_ODD);

      assert.equal('Unread messages in gitterHQ', subject);

      // Two rooms
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_TWO_ROOMS);

      assert.equal('Unread messages in gitterHQ and troupe', subject);

      // One user, one troupe
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_ONE_USER_ONE_ROOM);

      assert.equal('Unread messages in suprememoocow and troupe', subject);

      // One user
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_ONE_USER);

      // Two users
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_TWO_USERS);

      assert.equal('Unread messages from suprememoocow and billybob', subject);

      // Three user s
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_THREE_USERS);

      assert.equal('Unread messages in troupe, mydigitalshelf and one other', subject);

      // two rooms one user
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_TWO_ROOMS_ONE_USER);

      assert.equal('Unread messages from suprememoocow, mydigitalshelf and one other', subject);


      // Four user s
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_FOUR_USERS);

      assert.equal('Unread messages in troupe, mydigitalshelf and 2 others', subject);

      // Three user s
      subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_THREE_MIXTURE);

      assert.equal('Unread messages in and_then_a_channel, mydigitalshelf and one other', subject);

    });

    it('should generate nice subject lines in multiple languages', function() {
      var i18n = i18nFactory.get();
      i18nFactory.getLocales().forEach(function(lang) {
        i18n.setLocale(lang);

        var subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_ODD);
        assert(subject);

        // Two rooms
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_TWO_ROOMS);
        assert(subject);

        // One user, one troupe
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_ONE_USER_ONE_ROOM);
        assert(subject);

        // One user
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_ONE_USER);
        assert(subject);

        // Two users
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_TWO_USERS);
        assert(subject);

        // Three user s
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_THREE_USERS);
        assert(subject);

        // two rooms one user
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_TWO_ROOMS_ONE_USER);
        assert(subject);

        // Four user s
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_FOUR_USERS);
        assert(subject);

        // Three user s
        subject = emailNotificationService.testOnly.calculateSubjectForUnreadEmail(i18n, FIXTURE_THREE_MIXTURE);
        assert(subject);
      });

    });
  });

});
