define([
  'utils/context',
  'log!csrf'
], function(context, log) {
  'use strict';

  function urlMatch(url) {
    if(!url) return false;

    return url.indexOf('/') === 0 || url.match(/https:\/\/[\w.-_]*gitter.im\//);
  }

  (function(XHR) {
    var open = XHR.prototype.open;
    var send = XHR.prototype.send;

    XHR.prototype.open = function(method, url, async, user, pass) {
        this._addCredentials = urlMatch(url);

        if(url.indexOf('/api/') === 0) {
          var newUrl = context.env('apiBasePath') + url.substring(4);
          log('WARNING: api call redirected:', url, '->', newUrl);
          url = newUrl;
        }

        open.call(this, method, url, async, user, pass);
    };

    XHR.prototype.send = function(data) {
      var self = this;

      // No need for credentials? Pass the request on
      if(!this._addCredentials) {
        return send.call(this, data);
      }

      context.getAccessToken(function(accessToken) {
        self.setRequestHeader('x-access-token', accessToken);
        return send.call(self, data);
      });
    };
  })(XMLHttpRequest);

});
