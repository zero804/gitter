/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  './base',
  '../utils/momentWrapper'
], function(context, TroupeCollections, moment) {
  "use strict";

  var TroupeModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(message) {
      if(message.lastAccessTime) {
        message.lastAccessTime = moment(message.lastAccessTime, moment.defaultFormat);
      }

      return message;
    }
  });

  var TroupeCollection = TroupeCollections.LiveCollection.extend({
    model: TroupeModel,
    initialize: function() {
      this.url = "/user/" + context.getUserId() + "/troupes";
    }
  });

  return {
    TroupeCollection: TroupeCollection,
    TroupeModel: TroupeModel
  };
});
