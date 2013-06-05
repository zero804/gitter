var middleware = require('../web/middleware');
var Resource = require('express-resource');

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

    var troupesResource = app.resource('troupes',  require('./troupes/troupes'));

    function installTroupeSubResource(resourceName, moduleName) {
        var r = app.resource(resourceName,  require('./troupes/' + moduleName));
        troupesResource.add(r);
        return r;
    }

    installTroupeSubResource('invites', 'invites');
    installTroupeSubResource('requests', 'requests');
    installTroupeSubResource('users', 'users');
    installTroupeSubResource('conversations', 'conversations');
    installTroupeSubResource('files', 'files');
    installTroupeSubResource('downloads', 'downloads');
    installTroupeSubResource('embedded', 'embedded');
    installTroupeSubResource('thumbnails', 'thumbnails');


    var chatResource = installTroupeSubResource('chatMessages', 'chat-messages');
    var chatReadBy = new Resource('readBy', require('./troupes/chat-read-by'), app);
    chatResource.add(chatReadBy);


    installTroupeSubResource('unreadItems', 'unread-items');

    var userResource = app.resource('user',  require('./user/user.js'));
    function installUserSubResource(resourceName, moduleName) {
        var r = new Resource(resourceName, require('./user/' + moduleName), app);
        userResource.add(r);
        return r;
    }

    installUserSubResource('troupes', 'troupes');
    installUserSubResource('invites', 'invites');

  }
};