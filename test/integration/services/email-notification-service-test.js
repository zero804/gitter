#!/usr/bin/env mocha --ignore-leaks
"use strict";

var testRequire   = require('../test-require');
var Q             = require('q');

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

});
