/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var contextGenerator = require('../web/context-generator');
var middleware = require('../web/middleware');

function startPage(template, options) {
  return function(req, res, next) {
    contextGenerator.generateMiniContext(req, function(err, troupeContext) {
      if(err) return next(err);

      options.layout = 'start-template';
      options.troupeContext = troupeContext;
      options.page = template.split('/')[1];
      options.user = req.user;

      res.render(template, options);
    });
  };
}

module.exports = {

    install: function(app) {
      app.get('/start',
        middleware.ensureLoggedIn(),
        function(req, res) {
          res.relativeRedirect('/start/profile');
        });

      app.get('/start/profile',
        middleware.ensureLoggedIn(),
        startPage('start/profile', {
            title: 'Profile'
          }));

      app.get('/start/create',
        middleware.ensureLoggedIn(),
        startPage('start/create', {
            title: 'Create',
          }));

      app.get('/start/invite/:troupeId',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
        contextGenerator.generateSocketContext(req.user._id, req.params.troupeId)
          .then(function(context) {
            var options = {
              layout: 'start-template',
              troupeContext: context,
              page: 'invite',
              title: 'Invite',
              returnToUrl: req.url
            };
            res.render('start/invite', options);
          })
          .fail(next);
      });

      app.get('/start/finish',
        middleware.ensureLoggedIn(),
        startPage('start/finish', {
            title: 'Finished'
          }));

    }
};
