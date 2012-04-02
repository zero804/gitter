var troupeService = require("../services/troupe-service");

module.exports = {
    index: function(req, res){
      troupeService.findAllUnusedInvitesForTroupe(req.troupe.id, function(err, invites) {
        if(err) res.send(500);

        res.send(invites.narrow());
      });
    },

    new: function(req, res){
      res.send('new invites');
    },

    create: function(req, res) {
      var invites = req.body;
      for(var i = 0; i < invites.length; i++) {
        var share = invites[i];
        troupeService.addInvite(req.troupe, share.displayName, share.email);
      }
      
      res.send(invites.narrow());
    },

    show: function(req, res){
      res.send(req.share);
    },

    edit: function(req, res){
      res.send('edit forum ' + req.share.title);
    },

    update:  function(req, res){
      res.send('update forum ' + req.share.title);
    },

    destroy: function(req, res) {
      req.invite.remove();
      res.send(200);
    },

    load: function(id, callback){
      troupeService.findInviteById(id, callback);
    }

};
