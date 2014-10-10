var Resource = require('express-resource');

module.exports = {
  install: function(app, apiRoot, authMiddleware) {

    var resourceApiRoot = apiRoot ? apiRoot.substring(1) + '/' : '';

    // Secure the REST API
    ['/v1/:res(troupes|rooms)', '/v1/user'].forEach(function(path) {
        app.all(apiRoot + path, authMiddleware);
        app.all(apiRoot + path + '/', authMiddleware);
        app.all(apiRoot + path + '/*', authMiddleware);
    });

    var troupesResource = app.resource(resourceApiRoot + 'v1/:res(troupes|rooms)',  require('./troupes/troupes'));

    function installTroupeSubResource(resourceName, moduleName) {
        var r = app.resource(resourceName,  require('./troupes/' + moduleName));
        troupesResource.add(r);
        return r;
    }

    installTroupeSubResource('issues', 'issues');
    installTroupeSubResource('users', 'users');
    installTroupeSubResource('bans', 'bans');
    installTroupeSubResource('channels', 'channels');
    installTroupeSubResource('collaborators', 'collaborators');

    var chatResource = installTroupeSubResource('chatMessages', 'chat-messages');
    var chatReadBy = new Resource('readBy', require('./troupes/chat-read-by'), app);
    chatResource.add(chatReadBy);

    installTroupeSubResource('events', 'events');

    var userResource = app.resource(resourceApiRoot + 'v1/user',  require('./user/user.js'));
    function installUserSubResource(resourceName, moduleName) {
        var r = new Resource(resourceName, require('./user/' + moduleName), app);
        userResource.add(r);
        return r;
    }

    var userTroupeResource = installUserSubResource(':res(troupes|rooms)', 'troupes');

    var userSettings = new Resource('settings', require('./user/troupe-settings'), app);
    userTroupeResource.add(userSettings);

    var unreadItems = new Resource('unreadItems', require('./user/unread-items'), app);
    userTroupeResource.add(unreadItems);

    var collapsedItems = new Resource('collapsedItems', require('./user/collapsed-items'), app);
    userTroupeResource.add(collapsedItems);

    installUserSubResource('orgs',        'orgs');
    installUserSubResource('repos',       'repos');
    installUserSubResource('channels',    'channels');
    installUserSubResource('unreadItems', 'aggregated-unread-items');
  }
};
