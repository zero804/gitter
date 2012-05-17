/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

module.exports = {
  ensureLoggedIn: function(req, res, next) {
    if(req.user) {
      return next();
    }

    if(req.accepts('application/json')) {
      return next(new Error('Unauthorized'));
    } else {
      res.relativeRedirect('/login');
    }


  }
};