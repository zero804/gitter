"use strict";

var env           = require('gitter-web-env');
var express       = require('express');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use('/', require('./root'));
router.use('/logout', require('./logout'));
router.use('/login', require('./login'));

// Double route mounting for explore onto /explore and /home/~explore
router.use('/explore', require('./explore'));
router.use('/home/~explore', require('./explore'));

router.use('/home', require('./home'));
router.use('/learn', require('./learn'));
router.use('/mobile', require('./mobile'));
router.use('/settings', require('./settings'));

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
