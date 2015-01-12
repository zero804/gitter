/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var logout = require('../web/middlewares/logout');

exports.install = function(app) {
  app.post('/logout',
    logout,
    function(req, res) {
      res.format({
        text: function(){
          res.send('OK');
        },

        html: function(){
          res.relativeRedirect(nconf.get('web:homeurl'));
        },

        json: function(){
          res.send({ success:true, redirect: nconf.get('web:homeurl') });
        }
      });
    });
};
