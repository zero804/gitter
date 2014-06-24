var url = require('url');
var roomService = require('../services/room-service');

module.exports = {
  desktopToMobile: function(desktopUrl, user, cb) {
    var urlObj = url.parse(desktopUrl);
    var uri = urlObj.pathname.substring(1);

    return roomService.findOrCreateRoom(user, uri)
      .then(function(uriContext) {
          urlObj.pathname = '/mobile/chat';
          urlObj.hash = undefined;

          if(uriContext && uriContext.ownUrl) {
            urlObj.pathname = '/mobile/home';
          } else if(uriContext && uriContext.troupe) {
            urlObj.pathname = '/mobile/chat';
            urlObj.hash = uriContext.troupe.id;
          }

          return url.format(urlObj);
        })
      .nodeify(cb);
  }
};