'use strict';

var gravatar = require('../../utils/gravatar');

var DEFAULT_SIZE = 64;

var resolveGravatarForEmail = function(req, res) {
  var email = req.params.email;
  var size = req.query.s || DEFAULT_SIZE;
  var gravatarUrl = gravatar(email);

  switch(req.accepts(['json', 'text'])) {
    case 'json':
      res.send({
        avatarSrcSet: {
          src: gravatarUrl + (size ? '?s=' + size : ''),
          size: size,
          srcset: gravatarUrl + (size ? '?s=' + (size * 2) : '') + ' 2x',
        }
      });
      break;

    default:
      res.send(gravatarUrl + (size ? '?s=' + size : ''));
      break;
  }

};

module.exports = resolveGravatarForEmail;
