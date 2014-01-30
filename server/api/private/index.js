/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app) {
    app.get('/api/private/health_check',
        require('./health-check.js'));

    app.get('/api/private/user_email',
        require('./user-email'));

    app.get('/api/private/gh/*',
        require('./github-mirror'));

    // No auth for hooks yet
    app.post('/api/private/hook/:hash',
        require('./hooks'));
  }
};
