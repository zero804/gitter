var troupeService = require("../services/troupe-service"),
    mailService = require("../services/mail-service");

module.exports = {
    index: function(req, res, next) {
      var id = "4f689496e363dc07f1000006"; // will figure out how to pull this from the request later
      mailService.findById(id, function(err, mail) {
        if(err) return next(err);
        
       res.send(mail);
       });
      //res.send('hello');
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

    load: function(id, fn){
      process.nextTick(function(){
        fn(null, { id: id, title: 'SHARE' });
      });
    }

};
