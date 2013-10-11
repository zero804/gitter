/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var contextGenerator = require('../web/context-generator');

function startPage(template, options) {
  return function(req, res, next) {
    contextGenerator.generateMiniContext(req, function(err, troupeContext) {
      if(err) return next(err);

      options.layout = 'start-template';
      options.troupeContext = troupeContext;
      options.page = template.split('/')[1];

      res.render(template, options);
    });
  };
}

module.exports = {

    install: function(app) {
      app.get('/start',
        function(req, res) {
          res.relativeRedirect('/start/profile');
        });

      app.get('/start/profile',
        startPage('start/profile', {
            title: 'Profile'
          }));

      app.get('/start/create',
        startPage('start/create', {
            title: 'Create'
          }));

      app.get('/start/invite/:troupeId', function(req, res, next) {
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
        startPage('start/finish', {
            title: 'Finished'
          }));

    }
};
