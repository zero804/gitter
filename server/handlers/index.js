'use strict';

var env = require('gitter-web-env');
var express = require('express');
var urlJoin = require('url-join');
var preventClickjackingMiddleware = require('../web/middlewares/prevent-clickjacking');
var preventClickjackingOnlyGitterEmbedMiddleware = require('../web/middlewares/prevent-clickjacking-only-gitter-embed');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use('/', /* clickjacking is fine-tuned in the file */ require('./root'));
router.use('/logout', preventClickjackingMiddleware, require('./logout'));
router.use('/login', preventClickjackingMiddleware, require('./login'));

// Double route mounting for explore onto /explore and /home/~explore
router.use('/explore', preventClickjackingMiddleware, function(req, res, next) {
  // If logged in and trying to go to `/explore`, redirect to `/home/explore`
  if(req.user) {
    var userHomeExploreUrl = urlJoin('/home/explore', req.url);
    res.redirect(userHomeExploreUrl);
  } else {
    next();
  }
}, require('./explore'));

// The route for the inner frame
router.use('/home/~explore', preventClickjackingOnlyGitterEmbedMiddleware, require('./explore'));

router.use('/home', /* clickjacking is fine-tuned in the file */ require('./home'));
router.use('/learn', preventClickjackingOnlyGitterEmbedMiddleware, require('./learn'));
router.use('/mobile', preventClickjackingMiddleware, require('./mobile'));
router.use('/settings', /* clickjacking is fine-tuned in the file */ require('./settings'));
router.use('/orgs', /* clickjacking is fine-tuned in the file */ require('./org-pages'));

// Serve the service-worker code from the root
// `GET /sw.js`
require('gitter-web-service-worker/server/sw-static').install(router);

router.use('/', /* clickjacking is fine-tuned in the file */ require('./app'));

/* Catch all - return 404 error */
router.get('/*', function(req, res, next) {
  return next(404);
});

// Error Handlers
router.use(env.middlewares.errorReporter);
router.use(require('../web/middlewares/token-error-handler'));
router.use(require('../web/middlewares/express-error-handler'));

module.exports = router;
