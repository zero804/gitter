/* jshint node: true */
'use strict';

var env     = require('gitter-web-env');
var express = require('express');
var urlJoin = require('url-join');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use('/', require('./root'));
router.use('/logout', require('./logout'));
router.use('/login', require('./login'));

// Double route mounting for explore onto /explore and /home/~explore
router.use('/explore', function(req, res, next) {
  // If logged in and trying to go to `/explore`, redirect to `/home/explore`
  if(req.user) {
    var userHomeExploreUrl = urlJoin('/home/explore', req.url);
    res.redirect(userHomeExploreUrl);
  }
  else {
    next();
  }
}, require('./explore'));
// The route for the inner frame
router.use('/home/~explore', require('./explore'));

router.use('/home', require('./home'));
router.use('/learn', require('./learn'));
router.use('/mobile', require('./mobile'));
router.use('/settings', require('./settings'));
router.use('/orgs', require('./org-pages'));
router.use('/community-create', require('./community-create'));

router.use('/', require('./app'));

/* Catch all - return 404 error */
router.get('/*', function(req, res, next) {
  return next(404);
});

// Error Handlers
router.use(env.middlewares.errorReporter);
router.use(require('../web/middlewares/token-error-handler'));
router.use(require('../web/middlewares/express-error-handler'));

module.exports = router;
