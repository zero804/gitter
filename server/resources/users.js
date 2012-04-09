/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    userService = require("../services/user-service");

module.exports = {
    index: function(req, res, next) {
      userService.findByIds(req.troupe.users, function(err, users) {
        if(err) return next(err);
        
        res.send(users.narrow());
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

    load: function(id, fn){
      process.nextTick(function(){
        fn(null, { id: id, title: 'SHARE' });
      });
    }

};
