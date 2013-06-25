/*jshint unused:strict, browser:true */

define([
  'marionette',
  'views/base',
  'hbs!./tmpl/troupeListItem'
], function(Marionette, TroupeViews, troupeListItemTemplate) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'li',
    template: troupeListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: TroupeItemView
  });

});
