define([
  'jquery',
  'underscore',
  'backbone',
  'models/troupe'
], function($, _, Backbone, TroupeModel){
  var TroupeCollection = Backbone.Collection.extend({
    model: TroupeModel,
    url: "/troupes/",
    initialize: function() {
    }

  });

  return TroupeCollection;
});
