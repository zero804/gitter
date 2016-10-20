"use strict";

var assert = require('assert');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var notificationService = require('../lib/notification-service');
var topicNotificationGenerator = require('../lib/topic-notificaton-generator');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var mailerTemplate = require('gitter-web-mailer/lib/mailer-template');
var fs = require('fs');

describe('forum-notification-events', function() {

  describe('integration tests #slow', function() {

    describe('notificationObserver with multiple events', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        user2: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          sent: new Date('2014-01-01T00:00:00.000Z')
        },
        topic2: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          sent: new Date('2014-01-01T00:00:00.000Z')
        },
        reply1: {
          forum: 'forum1',
          category: 'category1',
          user: 'user2',
          topic: 'topic1',
          sent: new Date('2014-01-01T00:00:00.000Z')
        },
      });

      it('should batch the notifications in order', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var topicId2 = fixture.topic2._id;
        var replyId = fixture.reply1._id;
        var topicRef1 = ForumObject.createForTopic(forumId, topicId1);
        var topicRef2 = ForumObject.createForTopic(forumId, topicId2);
        var replyRef = ForumObject.createForReply(forumId, topicId1, replyId);


        // Create three notifications in order
        return notificationService.createNotifications(topicRef1, [userId])
          .then(function() {
            return notificationService.createNotifications(topicRef2, [userId]);
          })
          .then(function() {
            return notificationService.createNotifications(replyRef, [userId]);
          })
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toArray()
              .toPromise();
          })
          .then(function(notifications) {
            assert.strictEqual(notifications.length, 3);
            // first is topic 1
            assert.strictEqual(String(notifications[0].recipient._id), String(userId));
            assert.strictEqual(notifications[0].data.forum.id, String(forumId));
            assert.strictEqual(notifications[0].data.topic.id, String(topicId1));
            assert.strictEqual(notifications[0].data.reply, undefined);
            // second is topic 2
            assert.strictEqual(String(notifications[1].recipient._id), String(userId));
            assert.strictEqual(notifications[1].data.forum.id, String(forumId));
            assert.strictEqual(notifications[1].data.topic.id, String(topicId2));
            assert.strictEqual(notifications[1].data.reply, undefined);
            // last is reply1
            assert.strictEqual(String(notifications[2].recipient._id), String(userId));
            assert.strictEqual(notifications[2].data.forum.id, String(forumId));
            assert.strictEqual(notifications[2].data.topic.id, String(topicId1));
            assert.strictEqual(notifications[2].data.reply.id, String(replyId));
          });
      });
    });

    describe('notificationObserver new topic', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          title: 'How do I create amazing things in backbone without knowing how to code?',
          html: '<p>Hi there.</p><p>I recently learned how to switch on my computer and this person I met at Whole Foods was telling me he built a Facebook clone using backbone. I want to write an app that puts moustaches onto videos of dogs, how can I do that with backbone?</p><p>lol</p><p>smiley face</p>',
          text: 'Hi there./nI recently learned how to switch on my computer and this person I met at Whole Foods was telling me he built a Facebook clone using backbone. I want to write an app that puts moustaches onto videos of dogs, how can I do that with backbone?/nlol/nsmiley face'
        },
      });

      it('should raise notifications', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var topicRef1 = ForumObject.createForTopic(forumId, topicId1);

        // Create three notifications in order
        return notificationService.createNotifications(topicRef1, [userId])
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toPromise();
          })
          .then(function(notification) {
            return mailerTemplate('topic_new_topic_notification_html', {
              notification: notification.data
            });
          })
          .then(function(html) {
            if (process.env.WRITE_TEMPLATES) {
              fs.writeFileSync(__dirname + '/topic.html', html);
            }
          });
      });
    });

    describe('notificationObserver new reply', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          title: 'How do I create amazing things in backbone without knowing how to code?',
          html: '<p>Hi there.</p><p>I recently learned how to switch on my computer and this person I met at Whole Foods was telling me he built a Facebook clone using backbone. I want to write an app that puts moustaches onto videos of dogs, how can I do that with backbone?</p><p>lol</p><p>smiley face</p>',
          text: 'Hi there./nI recently learned how to switch on my computer and this person I met at Whole Foods was telling me he built a Facebook clone using backbone. I want to write an app that puts moustaches onto videos of dogs, how can I do that with backbone?/nlol/nsmiley face'
        },
        reply1: {
          forum: 'forum1',
          category: 'category1',
          user: 'user1',
          topic: 'topic1',
          html: '<p>Firstly, welcome to coding. </p><p>Secondly, if you just recompile your kernel to add RFC 2549 compliance, that should stand you in good stead for your future endevaours.</p><p>Secondly, backbone is so last century. Some people would recommend using React, but that is so last year. What you really need is my latest framework called themostcurrenthipframework.io. It is better than all the other ones because it does almost exactly the same thing, but you need 500 files of scaffholding for it to work before you do anything.</p><p>Then just put the name of your app in the config, a picture of a moustache in /public/resources/v7_LATEST/images/pngs/, and submit it to the app store.</p> ',
          text: 'Firstly, welcome to coding./nSecondly, if you just recompile your kernel to add RFC 2549 compliance, that should stand you in good stead for your future endevaours./nSecondly, backbone is so last century. Some people would recommend using React, but that is so last year. What you really need is my latest framework called themostcurrenthipframework.io. It is better than all the other ones because it does almost exactly the same thing, but you need 500 files of scaffholding for it to work before you do anything./nThen just put the name of your app in the config, a picture of a moustache in /public/resources/v7_LATEST/images/pngs/, and submit it to the app store.'
        },
      });

      it('should raise notifications', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var replyId1 = fixture.reply1._id;
        var replyRef1 = ForumObject.createForReply(forumId, topicId1, replyId1);

        // Create three notifications in order
        return notificationService.createNotifications(replyRef1, [userId])
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toPromise();
          })
          .then(function(notification) {
            return mailerTemplate('topic_new_reply_notification_html', {
              notification: notification.data
            });
          })
          .then(function(html) {
            if (process.env.WRITE_TEMPLATES) {
              fs.writeFileSync(__dirname + '/reply.html', html);
            }
          });
      });
    });

    describe('notificationObserver new comment', function() {
      var fixture = fixtureLoader.setup({
        user1: {},
        forum1: {},
        category1: {
          forum: 'forum1',
        },
        topic1: {
          user: 'user1',
          forum: 'forum1',
          category: 'category1',
          title: 'How do I create amazing things in backbone without knowing how to code?',
          html: '<p>Hi there.</p><p>I recently learned how to switch on my computer and this person I met at Whole Foods was telling me he built a Facebook clone using backbone. I want to write an app that puts moustaches onto videos of dogs, how can I do that with backbone?</p><p>lol</p><p>smiley face</p>',
          text: 'Hi there./nI recently learned how to switch on my computer and this person I met at Whole Foods was telling me he built a Facebook clone using backbone. I want to write an app that puts moustaches onto videos of dogs, how can I do that with backbone?/nlol/nsmiley face'
        },
        reply1: {
          forum: 'forum1',
          category: 'category1',
          user: 'user1',
          topic: 'topic1',
          html: '<p>Firstly, welcome to coding. </p><p>Secondly, if you just recompile your kernel to add RFC 2549 compliance, that should stand you in good stead for your future endevaours.</p><p>Secondly, backbone is so last century. Some people would recommend using React, but that is so last year. What you really need is my latest framework called themostcurrenthipframework.io. It is better than all the other ones because it does almost exactly the same thing, but you need 500 files of scaffholding for it to work before you do anything.</p><p>Then just put the name of your app in the config, a picture of a moustache in /public/resources/v7_LATEST/images/pngs/, and submit it to the app store.</p> ',
          text: 'Firstly, welcome to coding./nSecondly, if you just recompile your kernel to add RFC 2549 compliance, that should stand you in good stead for your future endevaours./nSecondly, backbone is so last century. Some people would recommend using React, but that is so last year. What you really need is my latest framework called themostcurrenthipframework.io. It is better than all the other ones because it does almost exactly the same thing, but you need 500 files of scaffholding for it to work before you do anything./nThen just put the name of your app in the config, a picture of a moustache in /public/resources/v7_LATEST/images/pngs/, and submit it to the app store.'
        },
        comment1: {
          user: 'user1',
          forum: 'forum1',
          topic: 'topic1',
          reply: 'reply1',
          html: '<strong>Seriously dude</strong> if you just right click and choose make moustache dog app, it will be much easier.',
          text: '**Seriously dude** if you just right click and choose make moustache dog app, it will be much easier.'
        }
      });

      it('should raise notifications', function() {

        var userId = fixture.user1._id;
        var forumId = fixture.forum1._id;
        var topicId1 = fixture.topic1._id;
        var replyId1 = fixture.reply1._id;
        var commentId1 = fixture.comment1._id;
        var commentRef1 = ForumObject.createForComment(forumId, topicId1, replyId1, commentId1);

        // Create three notifications in order
        return notificationService.createNotifications(commentRef1, [userId])
          .then(function() {
            return topicNotificationGenerator.notificationObserver({ userId: userId })
              .toPromise();
          })
          .then(function(notification) {
            return mailerTemplate('topic_new_comment_notification_html', {
              notification: notification.data
            });
          })
          .then(function(html) {
            if (process.env.WRITE_TEMPLATES) {
              fs.writeFileSync(__dirname + '/comment.html', html);
            }
          });
      });
    });


  });

});
