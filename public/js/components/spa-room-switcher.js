'use strict';

var _ = require('underscore');
var Backbone = require('backbone');

function SpaRoomSwitcher(troupesCollection, baseUrl, locationDelegate) {
  this._troupes = troupesCollection;
  this._baseUrl = baseUrl;
  this._locationDelegate = locationDelegate;
}

_.extend(SpaRoomSwitcher.prototype, Backbone.Events, {
  change: function(iframeUrl) {
    var frameLocation = this._locationDelegate();
    var hash;
    var windowHash = window.location.hash;

    if (!windowHash || windowHash === '#') {
      hash = '#initial';
    } else {
      hash = windowHash;
    }

    // fix for IE 10 giving iframeUrls with first slash missing
    if (iframeUrl.charAt(0) !== '/' && iframeUrl.indexOf(window.location.origin) !== 0) {
      iframeUrl = '/' + iframeUrl;
    }

    var self = this;
    function fallback() {
      self.trigger('replace', iframeUrl + hash);
    }

    var currentDomain = frameLocation.protocol + '//' + frameLocation.host;
    if (currentDomain !== this._baseUrl) {
      return fallback();
    }

    var currentType = this._getFrameType(frameLocation.pathname).type;

    if (currentType !== 'chat') return fallback();

    var match = iframeUrl.match(/(\/.*?)(\/~\w+)?$/);
    var referenceUrl = match && match[1];
    if (!referenceUrl) return fallback();

    var newTroupe = this._troupes.findWhere({
      url: referenceUrl,
    });

    //If we are navigating to a anything other than a chat refresh
    if (!newTroupe) return fallback();

    this.trigger('switch', newTroupe /*, TODO: permalink chat id */);
  },

  _getFrameType: function(locationHref) {
    var match = locationHref.match(/(\/.*?)(\/~(\w+))?$/);
    return {
      path: match && match[0],
      room: match && match[1],
      type: match && match[3],
    };
  },
});

module.exports = SpaRoomSwitcher;
