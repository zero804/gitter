module.exports = {
  install: function(app) {
    require('./signup').install(app);
    require('./signout').install(app);
    require('./profile').install(app);
    require('./login').install(app);
    require('./invite').install(app);
    require('./request-access').install(app);
    require('./avatar').install(app);
    require('./landing').install(app);
    require('./legals').install(app);
    require('./mac-app').install(app);
    require('./token').install(app);
    require('./health-check').install(app);
    require('./installChromeExtension').install(app);
  }
};