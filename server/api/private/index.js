"use strict";

var express = require('express');
var authMiddleware = require('../../web/middlewares/auth-api');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var skipTokenErrorHandler = require('../../web/middlewares/skip-token-error-handler')


var router = express.Router({ caseSensitive: true, mergeParams: true });

// No auth
router.get('/health_check',
  identifyRoute('api-private-health-check'),
  require('./health-check'));

// No auth
router.get('/health_check/full',
  identifyRoute('api-private-health-check-full'),
  require('./health-check-full'));

router.get('/gh/repos/*',
  authMiddleware,
  identifyRoute('api-private-github-repo-mirror'),
  require('./github-mirror/repos-mirror'));

router.get('/gh/users/*',
  authMiddleware,
  identifyRoute('api-private-github-users-mirror'),
  require('./github-mirror/users-mirror'));

router.get('/gh/search/users',
  authMiddleware,
  identifyRoute('api-private-github-user-search-mirror'),
  require('./github-mirror/user-search-mirror'));

// No auth for hooks yet
router.post('/hook/:hash',
  identifyRoute('api-private-hook'),
  require('./hooks'));

router.get('/irc-token',
  authMiddleware,
  identifyRoute('api-private-irc-token'),
  require('./irc-token'));

router.get('/issue-state',
  authMiddleware,
  identifyRoute('api-private-issue-state'),
  require('./issue-state'));

router.get('/generate-signature',
  authMiddleware,
  identifyRoute('api-private-transloadit-signature'),
  require('./transloadit-signature'));

// No auth
router.post('/transloadit/:token',
  identifyRoute('api-private-transloadit-callback'),
  require('./transloadit'));

router.get('/chat-heatmap/:roomId',
  authMiddleware,
  identifyRoute('api-private-chat-heatmap'),
  require('./chat-heatmap'));

router.get('/orgs/:orgUri/members',
  authMiddleware,
  skipTokenErrorHandler,
  identifyRoute('api-private-org-members'),
  require('./org-members'));


router.post('/subscription/:userOrOrg',
  identifyRoute('api-private-subscription-create'),
  require('./subscription-created'));

router.delete('/subscription/:userOrOrg',
  identifyRoute('api-private-subscription-delete'),
  require('./subscription-deleted'));

router.post('/statsc',
  identifyRoute('api-private-statsc'),
  require('./statsc'));

router.get('/sample-chats',
  identifyRoute('api-private-sample-chats'),
  require('./sample-chats'));

router.post('/create-badge',
  authMiddleware,
  identifyRoute('api-private-create-badge'),
  require('./create-badge-pr'));

router.post('/invite-user',
  authMiddleware,
  identifyRoute('api-private-invite-user'),
  require('./invite-user'));

router.get('/user-avatar/:username',
  identifyRoute('api-private-user-avatar'),
  require('./user-avatar'));

router.get('/avatars/gravatar/e/:email',
  identifyRoute('api-private-gravatar'),
  require('./gravatar'));

router.post('/markdown-preview',
  identifyRoute('api-private-markdown-preview'),
  require('./markdown-preview'));


module.exports = router;
