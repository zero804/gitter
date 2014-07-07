
define([
  'jquery-hammer',
  'marionette',
  'views/base',
  'hbs!./tmpl/homeOrgListItem',
  'utils/appevents',
  'utils/is-mobile'
], function($hammer, Marionette, TroupeViews, orgListItemTemplate, appEvents, isMobile) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: orgListItemTemplate,
    initialize: function() {
      this.$el = $hammer(this.$el).hammer();
      this.setRerenderOnChange(true);
    },
    getRenderData: function() {
      return this.model.toJSON();
    },
    events: function() {
      return isMobile() ? { tap: 'navigate' } : { click: 'navigate' };
    },
    navigate: function() {
      var name = this.model.get('name');
      var url = '/' + name;
      appEvents.trigger('navigation', url, 'chat', name);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'suggested-room-list',
    itemView: TroupeItemView
  });

});
