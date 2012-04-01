var chatService = require("../services/chat-service"),
    c = require("../utils/collections"),
    userService = require("../services/user-service");

module.exports = {
    index: function(req, res, next) {
      var skip = req.query.skip;
      var limit = req.query.limit;
      
      var options = {
          skip: skip ? skip : 0,
          limit: limit ? limit: 50
      };

      chatService.findChatMessagesForTroupe(req.troupe.id, options, function(err, chatMessages) {
        if(err) return next(err);

        var userIds = chatMessages.map(c.extract('fromUserId')).filterNulls().distinct();

        userService.findByIds(userIds, function(err, users) {
          if (err) return res.send(500);

          var usersIndexed = users.indexById();

          res.send(chatMessages.map(function(item) {
            var user = usersIndexed[item.fromUserId];

            return item.narrow(user, req.troupe);
          }));
        });
        
      });
    },

    new: function(req, res){
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res){
      res.send(500);
    },

    edit: function(req, res){
      res.send(500);
    },

    update:  function(req, res){
      res.send(500);
    },

    destroy: function(req, res){
      res.send(500);
    },

    load: function(id, callback) {
      chatService.findById(id, callback);
    }

};
