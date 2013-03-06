var middleware = require('../web/middleware');

module.exports = {
  install: function(app) {

    var auth = [
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn()
    ];

    // Secure the REST API
    ['/troupes', '/user'].forEach(function(path) {
        app.all(path, auth);
        app.all(path + '/*', auth);
    });

    var troupesResource = app.resource('troupes',  require('./troupes/troupes.js'));

    function installTroupeSubResource(resourceName, moduleName) {
        var r = app.resource(resourceName,  require('./troupes/' + moduleName));
        troupesResource.add(r);
    }

    installTroupeSubResource('invites', 'invites');
    installTroupeSubResource('requests', 'requests');
    installTroupeSubResource('users', 'users');
    installTroupeSubResource('conversations', 'conversations');
    installTroupeSubResource('files', 'files');
    installTroupeSubResource('downloads', 'downloads');
    installTroupeSubResource('embedded', 'embedded');
    installTroupeSubResource('thumbnails', 'thumbnails');
    installTroupeSubResource('chatMessages', 'chat-messages');
    installTroupeSubResource('unreadItems', 'unread-items');

    var userResource = app.resource('user',  require('./user/user.js'));
    function installUserSubResource(resourceName, moduleName) {
        var r = app.resource(resourceName,  require('./user/' + moduleName));
        userResource.add(r);
    }
    installUserSubResource('troupes', 'troupes');

  }
};