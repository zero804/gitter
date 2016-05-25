'use strict';

var gravatar = require('../../utils/gravatar');

var DEFAULT_SIZE = 64;

var resolveGravatarForEmail = function(req, res) {
  var email = req.params.email;
  var size = req.query.size || DEFAULT_SIZE;
  var gravatarUrl = gravatar(email);

  switch(req.accepts(['json', 'text'])) {
    case 'json':
      res.send({
        avatarSrcSet: {
          src: gravatarUrl + (size ? '?size=' + size : ''),
          size: size,
          srcset: gravatarUrl + (size ? '?size=' + (size * 2) : '') + ' 2x',
        }
      });
      break;

    default:
      res.send(gravatarUrl + (size ? '?size=' + size : ''));
      break;
  }

};

module.exports = resolveGravatarForEmail;
