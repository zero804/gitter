/*jshint unused:strict, browser:true */
define([
  'backbone',
  'utils/context',
  './base',
  '../utils/momentWrapper'
], function(Backbone, context, TroupeCollections, moment) {
  "use strict";

  var exports = {};
  exports.TroupeModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(message) {
      if(message.lastAccessTime) {
        message.lastAccessTime = moment(message.lastAccessTime, moment.defaultFormat);
      }

      return message;
    }
  });

  exports.TroupeCollection = TroupeCollections.LiveCollection.extend({
    model: exports.TroupeModel,
    preloadKey: "troupes",
    initialize: function() {
      this.url = "/user/" + window.troupeContext.user.id + "/troupes";
    }
  });

  return exports;
});
