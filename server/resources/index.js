module.exports = {
  install: function(app) {

    var troupesResource = app.resource('troupes',  require('./troupes.js'));

    function installSubResource(resourceName, moduleName) {
        var r = app.resource(resourceName,  require('./' + moduleName));
        troupesResource.add(r);
    }

    installSubResource('invites', 'invites.js');
    installSubResource('requests', 'requests.js');
    installSubResource('users', 'users.js');
    installSubResource('conversations', 'conversations.js');
    installSubResource('files', 'files.js');
    installSubResource('downloads', 'downloads.js');
    installSubResource('embedded', 'embedded.js');
    installSubResource('thumbnails', 'thumbnails.js');
    installSubResource('chatMessages', 'chat-messages.js');
    installSubResource('notifications', 'notifications.js');
    installSubResource('unreadItems', 'unread-items.js');
  }
};