'use strict';

var speedy      = require ("speedy");
var persistence = require('gitter-web-persistence');
var chatService = require('../../server/services/chat-service');
var mongoose    = require('gitter-web-mongoose-bluebird');

var ObjectID = mongoose.mongo.ObjectID;

// speedy.samples (10);

speedy.run ({
  withHintAroundId: function (done) {
    chatService.testOnly.setUseHints(true);

    chatService.findChatMessagesForTroupe("54d244f1c53660e29b9f91d9", { aroundId: "54dde310ef961706de37462d"})
      .nodeify(done);
  },
  withoutHintAroundId: function (done) {
    chatService.testOnly.setUseHints(false);

    chatService.findChatMessagesForTroupe("54d244f1c53660e29b9f91d9", { aroundId: "54dde310ef961706de37462d"})
      .nodeify(done);
  },
  withHintBeforeId: function (done) {
    chatService.testOnly.setUseHints(true);

    chatService.findChatMessagesForTroupe("54d244f1c53660e29b9f91d9", { beforeId: "54dde310ef961706de37462d"})
      .nodeify(done);
  },
  withoutHintBeforeId: function (done) {
    chatService.testOnly.setUseHints(false);

    chatService.findChatMessagesForTroupe("54d244f1c53660e29b9f91d9", { beforeId: "54dde310ef961706de37462d"})
      .nodeify(done);
  },
  withHintLatest: function (done) {
    chatService.testOnly.setUseHints(true);

    chatService.findChatMessagesForTroupe("54d244f1c53660e29b9f91d9", { })
      .nodeify(done);
  },
  withoutHintLatest: function (done) {
    chatService.testOnly.setUseHints(false);

    chatService.findChatMessagesForTroupe("54d244f1c53660e29b9f91d9", { })
      .nodeify(done);
  },
  firstMessageInRoom: function(done) {
    chatService.getDateOfFirstMessageInRoom("54d244f1c53660e29b9f91d9")
      .nodeify(done);
  }
});
