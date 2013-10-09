/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";


module.exports = {

    install: function(app) {
      app.get('/start/profile',
        function(req, res, next) {
          res.render('start/profile', {
            title: 'Profile',
            layout: 'start-template'
          });
        });

      app.get('/start/create',
        function(req, res, next) {
          res.render('start/create', {
            title: 'Create',
            layout: 'start-template'
          });
        });

      app.get('/start/invite',
        function(req, res, next) {
          res.render('start/invite', {
            title: 'Invite',
            layout: 'start-template'
          });
        });

      app.get('/start/finish',
        function(req, res, next) {
          res.render('start/finish', {
            title: 'Finished',
            layout: 'start-template'
          });
        });

    }
};
