/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'utils/context',
  'marionette',
  'views/base',
  'hbs!./tmpl/conversationItemView',
  'hbs!./tmpl/conversationHelpView'
], function(_, context, Marionette, TroupeViews, conversationItemViewTemplate, conversationHelpTemplate){
  "use strict";

  function getData() {
    var troupe = context.getTroupe();

    return {
      emailAddress: troupe.uri + '@' + context.env('baseServer'),
      troupeName: (troupe.name) ? troupe.name.replace(/\s/g,"%20") : ""
    };
  }


  var ConversationItemView = TroupeViews.Base.extend({
    template: conversationItemViewTemplate,

    getRenderData: function() {
      var data = this.model.toJSON();
      data.detailUrl = "#mail/" + data.id;
      data.updated = data.updated ? data.updated.calendar() : null;
      return data;
    }

  });

  var ConversationCollectionView = Marionette.CollectionView.extend({
    itemView: ConversationItemView,
    emptyView: TroupeViews.Base.extend({
      template: conversationHelpTemplate,
      initialize: function() {
        this.data = getData();
      }
    })
  }).mixin([TroupeViews.SortableMarionetteView]);

  return ConversationCollectionView;
});
