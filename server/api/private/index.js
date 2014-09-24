/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

module.exports = {
  install: function(app, apiRoot, authMiddleware) {

    app.get(apiRoot + '/private/health_check',
        // No auth
        require('./health-check.js'));

    app.get(apiRoot + '/private/health_check/full',
        // No auth
        require('./health-check-full.js'));

    // app.get(apiRoot + '/private/user_email',
    //     authMiddleware,
    //     require('./user-email'));

    app.get(apiRoot + '/private/gh/repos/*',
        authMiddleware,
        require('./github-mirror/repos-mirror'));

    app.get(apiRoot + '/private/gh/users/*',
        authMiddleware,
        require('./github-mirror/users-mirror'));

    app.get(apiRoot + '/private/gh/user/repos',
        authMiddleware,
        require('./github-mirror/user-repos-mirror'));

    app.get(apiRoot + '/private/gh/search/users',
        authMiddleware,
        require('./github-mirror/user-search-mirror'));

    // No auth for hooks yet
    app.post(apiRoot + '/private/hook/:hash',
        require('./hooks'));

    app.get(apiRoot + '/private/irc-token',
        authMiddleware,
        require('./irc-token.js'));

    app.get(apiRoot + '/private/issue-state',
        authMiddleware,
        require('./issue-state.js'));

    app.get(apiRoot + '/private/room-permission',
        authMiddleware,
        require('./room-permission.js'));

    app.get(apiRoot + '/private/generate-signature',
        authMiddleware,
        require('./transloadit-signature.js'));

    app.post(apiRoot + '/private/transloadit/:token',
        // No auth
        require('./transloadit.js'));

    app.get(apiRoot + '/private/chat-heatmap/:roomId',
        // No auth
        require('./chat-heatmap.js'));

    app.get(apiRoot + '/private/orgs/:orgUri/members',
        authMiddleware,
        require('./org-members.js'));

    app.post(apiRoot + '/private/subscription/:userOrOrg',
        require('./subscription-created.js'));

    app.delete(apiRoot + '/private/subscription/:userOrOrg',
        require('./subscription-deleted.js'));

    app.post(apiRoot + '/private/statsc',
        require('./statsc.js'));

    app.get(apiRoot + '/private/sample-chats',
        require('./sample-chats.js'));

    app.post(apiRoot + '/private/create-badge',
        authMiddleware,
        require('./create-badge-pr.js'));

    app.post(apiRoot + '/private/invite-user',
        authMiddleware,
        require('./manual-invite.js'));

  }
};
