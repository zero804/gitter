
define([
  'utils/context',
  'marionette',
  'hbs!./tmpl/org-list-item',
  'utils/appevents'
], function(context, Marionette, orgListItemTemplate, appEvents) {
  "use strict";

  var OrgItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'menu-list-item',
    template: orgListItemTemplate,
    modelEvents: {
      change: 'render',
    },
    events: {
      click: 'clicked'
    },
    serializeData: function() {
      var data = {};
      data.org = this.model.toJSON();
      data.user = context.getUser();
      return data;
    },
    clicked: function(e) {
      e.preventDefault();
      appEvents.trigger('navigation', '/' + this.model.get('name'), 'chat', this.model.get('name'), null);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: OrgItemView
  });

});
