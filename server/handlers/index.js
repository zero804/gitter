/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
  install: function(app) {
    require('./appcache').install(app);
    require('./cdn').install(app);
    require('./native').install(app);
    require('./signup').install(app);
    require('./signout').install(app);
    require('./login').install(app);
    require('./landing').install(app);
    require('./legals').install(app);
    require('./apps').install(app);
    require('./test-data').install(app);
    require('./unawesome-browser').install(app);
    require('./start').install(app);
    require('./unsubscribe').install(app);
  }
};
