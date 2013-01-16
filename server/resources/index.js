var middleware = require('../web/middleware');

module.exports = {
  install: function(app) {

    var auth = middleware.ensureLoggedIn();

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

    installTroupeSubResource('invites', 'invites.js');
    installTroupeSubResource('requests', 'requests.js');
    installTroupeSubResource('users', 'users.js');
    installTroupeSubResource('conversations', 'conversations.js');
    installTroupeSubResource('files', 'files.js');
    installTroupeSubResource('downloads', 'downloads.js');
    installTroupeSubResource('embedded', 'embedded.js');
    installTroupeSubResource('thumbnails', 'thumbnails.js');
    installTroupeSubResource('chatMessages', 'chat-messages.js');
    installTroupeSubResource('notifications', 'notifications.js');
    installTroupeSubResource('unreadItems', 'unread-items.js');

    var userResource = app.resource('user',  require('./user/user.js'));

  }
};