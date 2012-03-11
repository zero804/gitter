var troupeService = require("../services/troupe-service");

module.exports = {
    index: function(req, res){
      res.send('share index');
    },

    new: function(req, res){
      res.send('new share');
    },

    create: function(req, res) {
      var shares = req.body;
      for(var i = 0; i < shares.length; i++) {
        var share = shares[i];
        troupeService.addInvite(req.troupe, share.displayName, share.email);
      }
      
      res.send(shares);
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

    destroy: function(req, res){
      res.send('destroy forum ' + req.share.title);
    },

    load: function(id, fn){
      process.nextTick(function(){
        fn(null, { id: id, title: 'SHARE' });
      });
    }

};
