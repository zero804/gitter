'use strict';

const Promise = require('bluebird');
const env = require('gitter-web-env');
const stats = env.stats;
const logger = env.logger.get('chat-report-service');
const StatusError = require('statuserror');
const mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const User = require('gitter-web-persistence').User;
const ChatMessageReport = require('gitter-web-persistence').ChatMessageReport;
const chatService = require('gitter-web-chats');
const userService = require('gitter-web-users');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const calculateReportWeight = require('./lib/calculate-report-weight').calculateReportWeight;

const BAD_USER_THRESHOLD = 5;
const BAD_MESSAGE_THRESHOLD = 2;
const ONE_DAY_TIME = 24 * 60 * 60 * 1000; // One day
const SUM_PERIOD = 5 * ONE_DAY_TIME;
const NEW_USER_CLEAR_MESSAGE_PERIOD = 3 * ONE_DAY_TIME;

function getReportSumForUser(userInQuestionId) {
  return ChatMessageReport.find({ messageUserId: userInQuestionId })
    .lean()
    .exec()
    .then(function(reports) {
      const resultantReportMap = reports.reduce(function(reportMap, report) {
        const reportSent = report.sent ? report.sent.valueOf() : Date.now();
        const reportWithinRange = (Date.now() - reportSent) <= SUM_PERIOD;
        // Only count the biggest report from a given user against another
        const isBiggerWeight = !reportMap[report.reporterUserId] || report.weight > reportMap[report.reporterUserId];

        if(reportWithinRange && isBiggerWeight) {
          reportMap[report.reporterUserId] = report.weight || 0;
        }

        return reportMap;
      }, {});

      return Object.keys(resultantReportMap).reduce(function(sum, reporterUserIdKey) {
        return sum + resultantReportMap[reporterUserIdKey];
      }, 0);
    });
}

function getReportSumForMessage(messageId) {
  return ChatMessageReport.find({ messageId: messageId })
    .lean()
    .exec()
    .then(function(reports) {
      return reports.reduce(function(sum, report) {
        return sum + report.weight;
      }, 0);
    });
}

function newReport(fromUser, messageId) {
  const reporterUserId = fromUser._id || fromUser.id;
  return chatService.findById(messageId)
    .bind({})
    .then(function(chatMessage) {
      this.chatMessage = chatMessage;

      if (!chatMessage) {
        throw new StatusError(404, `Chat message not found (${messageId})`);
      }
      else if(mongoUtils.objectIDsEqual(reporterUserId, this.chatMessage.fromUserId)) {
        throw new StatusError(403, 'You can\'t report your own message');
      }

      return troupeService.findByIdLean(this.chatMessage.toTroupeId);
    })
    .then(function(room) {
      this.room = room;

      if (!room) {
        throw new StatusError(404, `Room not found (${this.chatMessage.toTroupeId})`);
      }

      return calculateReportWeight(fromUser, this.room, this.chatMessage);
    })
    .then(function(weight) {
      this.weight = weight;

      return mongooseUtils.upsert(ChatMessageReport, { reporterUserId: reporterUserId, messageId: messageId }, {
        $setOnInsert: {
          weight: this.weight,
          reporterUserId: reporterUserId,
          messageId: messageId,
          messageUserId: this.chatMessage.fromUserId,
          text: this.chatMessage.text
        }
      })
    })
    .spread(function(report, updateExisting) {
      let checkUserPromise = Promise.resolve();
      let checkMessagePromise = Promise.resolve();

      if(!updateExisting) {
        const room = this.room;
        const chatMessage = this.chatMessage;

        // Send a stat for a new report
        stats.event('new_chat_message_report', {
          sent: report.sent,
          weight: report.weight,
          reporterUserId: report.reporterUserId,
          messageId: report.messageId,
          messageUserId: report.messageUserId,
          text: report.text
        });

        checkUserPromise = getReportSumForUser(report.messageUserId)
          .then(function(sum) {
            logger.info(`Report from ${report.reporterUserId} with weight=${report.weight} made against user ${report.messageUserId}, sum=${sum}/${BAD_USER_THRESHOLD}`);
            if(sum >= BAD_USER_THRESHOLD) {
              stats.event('new_bad_user_from_reports', {
                userId: report.messageUserId,
                sum: sum
              });

              // Only clear messages for new users (spammers)
              const userCreated = mongoUtils.getTimestampFromObjectId(chatMessage.fromUserId);
              const shouldClearMessages = (Date.now() - userCreated) < NEW_USER_CLEAR_MESSAGE_PERIOD;

              logger.info(`Bad user ${report.messageUserId} detected (hellban${shouldClearMessages ? ' and removing all messages' : ''}), sum=${sum}/${BAD_USER_THRESHOLD}`);
              userService.hellbanUser(report.messageUserId);
              if(shouldClearMessages) {
                chatService.removeAllMessagesForUserId(report.messageUserId);
              }
            }

            return null;
          });

        checkMessagePromise = getReportSumForMessage(report.messageId)
          .then(function(sum) {
            logger.info(`Report from ${report.reporterUserId} with weight=${report.weight} made against message ${report.messageId}, sum is now, sum=${sum}/${BAD_MESSAGE_THRESHOLD}`);

            if(sum >= BAD_MESSAGE_THRESHOLD) {
              stats.event('new_bad_message_from_reports', {
                messageId: report.messageId,
                sum: sum
              });

              logger.info(`Bad message ${report.messageId} detected (removing) sum=${sum}/${BAD_MESSAGE_THRESHOLD}`);
              chatService.deleteMessageFromRoom(room, chatMessage);
            }

            return null;
          });
      }

      return Promise.all([
        checkUserPromise,
        checkMessagePromise
      ])
        .then(function() {
          return report;
        });
    });
}

function findByIds(ids, callback) {
  return mongooseUtils.findByIds(ChatMessageReport, ids, callback);
}

module.exports = {
  BAD_USER_THRESHOLD: BAD_USER_THRESHOLD,
  BAD_MESSAGE_THRESHOLD: BAD_MESSAGE_THRESHOLD,
  getReportSumForUser: getReportSumForUser,
  getReportSumForMessage: getReportSumForMessage,
  newReport: newReport,
  findByIds: findByIds
};
