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
      if(typeof message.lastAccessTime === 'string') {
        message.lastAccessTime = moment(message.lastAccessTime, moment.defaultFormat);
      }

      return message;
    }
  }, { modelType: 'troupe' });

  var TroupeCollection = TroupeCollections.LiveCollection.extend({
    model: TroupeModel,
    initialize: function() {
      this.url = "/api/v1/user/" + context.getUserId() + "/troupes";
      this.listenTo(this, 'change:name', this.replicateContext);
    },

    replicateContext: function(model) {
      if(model.id === context.getTroupeId()) {
        context.troupe().set(model.toJSON());
      }
    }
  });

  return {
    TroupeCollection: TroupeCollection,
    TroupeModel:      TroupeModel
  };
});
