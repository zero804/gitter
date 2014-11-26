/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var contextGenerator = require('../web/context-generator');

module.exports = {
    install: function(app) {
      app.get(
        '/_/diagnostics/faye',
        function(req, res, next) {
          contextGenerator.generateNonChatContext(req)
            .then(function(context) {
              res.render('faye-diagnostics', {
                context: context
              });
            })
            .fail(next);
        }
      );
    }
};
