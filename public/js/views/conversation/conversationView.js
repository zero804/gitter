/*jshint unused:strict, browser:true */

define([
  'jquery',
  'underscore',
  'utils/context',
  'backbone',
  'marionette',
  'views/base',
  'collections/conversations',
  'hbs!./tmpl/conversationItemView',
  'hbs!./tmpl/conversationHelpView'
], function($, _, context, Backbone, Marionette, TroupeViews, conversationModels, conversationItemViewTemplate, conversationHelpTemplate){
  "use strict";

  function getData() {
    var tx = window.troupeContext;

    return {
      emailAddress: tx.troupe.uri + '@' + tx.baseServer,
      troupeName: (tx.troupe.name) ? tx.troupe.name.replace(/\s/g,"%20") : ""
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
      data: getData()
    })
  });

  _.extend(ConversationCollectionView.prototype, TroupeViews.SortableMarionetteView);
  return ConversationCollectionView;
});
