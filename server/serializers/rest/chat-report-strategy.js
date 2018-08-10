"use strict";

const UserIdStrategy = require('./user-id-strategy');

function ChatReportStrategy(/*options*/) {
  const userIdStategy = UserIdStrategy.slim();

  this.preload = function(reports) {
    const userIds = reports.map(function(report) { return report.reporterUserId; });
    return userIdStategy.preload(userIds);
  };

  this.map = function(report) {
    const fromUser = userIdStategy.map(report.reporterUserId);

    if(!fromUser) return null;

    return {
      fromUser: fromUser,
      messageId: report.messageId,
      messageText: report.text
    };
  };
}
ChatReportStrategy.prototype = {
  name: 'ChatReportStrategy'
};


module.exports = ChatReportStrategy;
