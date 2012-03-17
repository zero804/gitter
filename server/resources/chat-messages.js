var chatService = require("../services/chat-service");

module.exports = {
    index: function(req, res, next) {
      var skip = req.query.skip;
      var limit = req.query.limit;
      
      var options = {
          skip: skip ? skip : 0,
          limit: limit ? limit: 50
      };

      console.log("skip=" + skip + ", limit = " + limit);
      chatService.findChatMessagesForTroupe(req.troupe.id, options, function(err, chatMessages) {
        if(err) return next(err);
        
        res.send(chatMessages);
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
