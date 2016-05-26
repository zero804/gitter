'use strict';

var gravatar = require('../../utils/gravatar');

var DEFAULT_SIZE = 64;

var addSizeToUrl = function(url, size) {
  return url + (size ? '?s=' + size : '');
};

var resolveGravatarForEmail = function(req, res) {
  var email = req.params.email;
  var size = req.query.s || DEFAULT_SIZE;
  var gravatarUrl = gravatar(email);

  switch(req.accepts(['json', 'text', 'image/*'])) {
    case 'image/*':
      res.redirect(addSizeToUrl(gravatarUrl, size));
      break;
    case 'json':
      res.send({
        avatarSrcSet: {
          src: addSizeToUrl(gravatarUrl, size),
          size: size,
          srcset: addSizeToUrl(gravatarUrl, size * 2)
        }
      });
      break;

    default:
      res.send(addSizeToUrl(gravatarUrl, size));
      break;
  }

};

module.exports = resolveGravatarForEmail;
