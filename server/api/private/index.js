"use strict";

var express = require('express');
var authMiddleware = require('../../web/middlewares/auth-api');
var router = express.Router({ caseSensitive: true, mergeParams: true });

// No auth
router.get('/health_check', require('./health-check.js'));

// No auth
router.get('/health_check/full', require('./health-check-full.js'));

router.get('/gh/repos/*', authMiddleware, require('./github-mirror/repos-mirror'));

router.get('/gh/users/*', authMiddleware, require('./github-mirror/users-mirror'));

router.get('/gh/search/users', authMiddleware, require('./github-mirror/user-search-mirror'));

// No auth for hooks yet
router.post('/hook/:hash', require('./hooks'));

router.get('/irc-token', authMiddleware, require('./irc-token.js'));

router.get('/issue-state', authMiddleware, require('./issue-state.js'));

router.get('/room-permission', authMiddleware, require('./room-permission.js'));

router.get('/generate-signature', authMiddleware, require('./transloadit-signature.js'));

// No auth
router.post('/transloadit/:token', require('./transloadit.js'));

// No auth
router.get('/chat-heatmap/:roomId', require('./chat-heatmap.js'));

router.get('/orgs/:orgUri/members', authMiddleware, require('./org-members.js'));

router.post('/subscription/:userOrOrg', require('./subscription-created.js'));

router.delete('/subscription/:userOrOrg', require('./subscription-deleted.js'));

router.post('/statsc', require('./statsc.js'));

router.get('/sample-chats', require('./sample-chats.js'));

router.post('/create-badge', authMiddleware, require('./create-badge-pr.js'));

router.post('/invite-user', authMiddleware, require('./invite-user.js'));

module.exports = router;
