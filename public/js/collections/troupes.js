/*jshint unused:true, browser:true */
define([
  'backbone',
  './base'
], function(Backbone, TroupeCollections) {
  "use strict";

  var exports = {};
  exports.TroupeModel = TroupeCollections.Model.extend({
    idAttribute: "id"
  });

  exports.TroupeCollection = TroupeCollections.LiveCollection.extend({
    model: exports.TroupeModel,
    initialize: function() {
      this.url = "/user/" + window.troupeContext.user.id + "/troupes";
    }
  });

  return exports;
});
