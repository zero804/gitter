/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
  install: function(app) {
    require('./signup').install(app);
    require('./signout').install(app);
    require('./profile').install(app);
    require('./login').install(app);
    require('./avatar').install(app);
    require('./landing').install(app);
    require('./legals').install(app);
    require('./mac-app').install(app);
    require('./join-us').install(app);
    require('./ios-app').install(app);
    require('./token').install(app);
    require('./health-check').install(app);
    require('./installChromeExtension').install(app);
    require('./test-data').install(app);
  }
};