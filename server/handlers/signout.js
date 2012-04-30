/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

module.exports = {
    install: function(app) {
      /* Cheap trick for testing */
      app.get('/signout', function(req, res) {
        req.session.destroy();
        res.relativeRedirect('/');
      });

    }
};