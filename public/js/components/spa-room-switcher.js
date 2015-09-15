'use strict';

var _ = require('underscore');
var Backbone = require('backbone');
var urlParser = require('../utils/url-parser');

function SpaRoomSwitcher(troupesCollection, baseUrl, locationDelegate, windowLocationDelegate) {
  this._troupes = troupesCollection;
  this._baseUrl = baseUrl;
  this._locationDelegate = locationDelegate;
  this._windowLocationDelegate = windowLocationDelegate || function() { return window.location; }; // Makes testing in node easier.
}

_.extend(SpaRoomSwitcher.prototype, Backbone.Events, {
  change: function(iframeUrl) {

    if (!iframeUrl.search(/^https?:/i) && iframeUrl.charAt(0) !== '/') {
      // fix for IE 10 giving iframeUrls with first slash missing
      iframeUrl = '/' + iframeUrl;
    }

    var frameLocation = this._locationDelegate();
    var windowLocation = this._windowLocationDelegate();
    var targetParsed = urlParser.parse(iframeUrl);

    var self = this;
    function fallback() {
      var windowHash = windowLocation.hash;
      var hash = (!windowHash || windowHash === '#') ? '#initial' : windowHash;
      targetParsed.hash = hash;
      var href = urlParser.format(targetParsed);

      // If the only thing that differs is the hash, then force a reload
      if (href.replace(/#.*$/,'') === frameLocation.href.replace(/#.*$/,'')) {
        self.trigger('reload');
      } else {
        self.trigger('replace', href);
      }
    }

    // The frame is currently pointing at another site. Unlikely but possible
    var currentDomain = frameLocation.protocol + '//' + frameLocation.host;
    if (currentDomain !== this._baseUrl) return fallback();

    // Check that the frame already has a ~chat page
    var currentType = this.getFrameType(frameLocation.pathname).type;
    if (currentType !== 'chat') return fallback();

    // For now go back to the server for anything with a query
    if (targetParsed.search && targetParsed.search !== '?') return fallback();

    // Check that we are navigating to a ~chat page
    var targetInfo = this.getFrameType(targetParsed.pathname);
    if (targetInfo.type !== 'chat' || !targetInfo.roomUrl) return fallback();

    // Try find the room in the collection
    var newTroupe = this._troupes.findWhere({ url: targetInfo.roomUrl });

    // If we can't find the room, abort
    if (!newTroupe) return fallback();

    this.trigger('switch', newTroupe /*, TODO: permalink chat id */);
  },

  getFrameType: function(locationHref) {
    var match = locationHref.match(/(\/.*?)(\/~(\w+))?$/);
    if (!match) return {};

    return {
      roomUrl: match[1],
      type: match[3],
    };
  },
});

module.exports = SpaRoomSwitcher;
