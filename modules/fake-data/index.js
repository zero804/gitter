"use strict";

module.exports = {
  getForum:    require('./lib/forum'),
  getTopics:   require('./lib/topics'),
  getTopic:    require('./lib/topics/get-topic'),
  getReplies:  require('./lib/replies'),
  getReply:    require('./lib/replies/get-reply'),
  getComments: require('./lib/comments'),
};
