var troupeService = require("../services/troupe-service");

module.exports = {
    index: function(req, res){
      res.send('troupes index');
    },

    new: function(req, res){
      res.send('new troupe');
    },

    create: function(req, res){
      res.send('create troupe');
    },

    show: function(req, res){
      res.send(req.troupe);
    },

    edit: function(req, res){
      res.send('edit forum ' + req.troupe.title);
    },

    update:  function(req, res){
      res.send('update forum ' + req.troupe.title);
    },

    destroy: function(req, res){
      res.send('destroy forum ' + req.troupe.title);
    },

    load: function(id, callback) {
      troupeService.findById(id, callback);
    }

};
