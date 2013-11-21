/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  './base',
  '../utils/momentWrapper',
  'backbone'
], function(context, TroupeCollections, moment, Backbone) {
  "use strict";

  var TroupeModel = TroupeCollections.Model.extend({
    idAttribute: "id",
    parse: function(message) {
      if(message.lastAccessTime) {
        message.lastAccessTime = moment(message.lastAccessTime, moment.defaultFormat);
      }

      return message;
    }
  }, { modelType: 'troupe' });

  var TroupeCollection = TroupeCollections.LiveCollection.extend({
    model: TroupeModel,
    initialize: function() {
      this.url = "/user/" + context.getUserId() + "/troupes";
      this.listenTo(this, 'change:name', this.replicateContext);
    },

    replicateContext: function(model) {
      if(model.id === context.getTroupeId()) {
        context.troupe().set(model.toJSON());
      }
    }
  });


  var OrgModel = TroupeCollections.Model.extend({
    idAttribute: 'name'
  });

  var OrgCollection = Backbone.Collection.extend({
    model: OrgModel,
    initialize: function() {
      this.url = "/user/" + context.getUserId() + "/orgs";
      this.listenTo(this, 'change:name', this.replicateContext);
    }
  });


  return {
    TroupeCollection: TroupeCollection,
    TroupeModel:      TroupeModel,
    OrgCollection:    OrgCollection,
    OrgModel:         OrgModel
  };
});
