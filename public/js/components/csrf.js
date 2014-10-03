define([
  'utils/context'
], function(context) {
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
        var newUrl = url.indexOf('/api') === 0 ? context.env('basePath') + url : url;

        open.call(this, method, newUrl, async, user, pass);
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
