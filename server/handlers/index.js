/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

module.exports = {
  install: function(app) {
    require('./appcache').install(app);
    require('./cdn').install(app);
    require('./signup').install(app);
    require('./signout').install(app);
    require('./login').install(app);
    require('./apps').install(app);
    require('./explore').install(app);
    require('./test-data').install(app);
    require('./unawesome-browser').install(app);
    require('./unsubscribe').install(app);
    require('./in-browser-tests').install(app);
    require('./robots').install(app);
    require('./home').install(app);
    require('./diagnostics').install(app);
  }
};
