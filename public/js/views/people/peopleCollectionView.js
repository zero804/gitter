define([
  'marionette',
  'views/base',
  'hbs!./peopleItemView',
  'hbs!./peopleAddPersonButtonView'
], function(Marionette, TroupeViews, peopleItemViewTemplate, peopleAddPersonButtonViewTemplate) {
  /*jslint browser: true*/
  /*global require */
  "use strict";

  var PeopleItemView = TroupeViews.Base.extend({
    template: peopleItemViewTemplate
  });

  var PeopleAddPersonButtonView = TroupeViews.Base.extend({
    template: peopleAddPersonButtonViewTemplate,
    className: 'trpAddButton'
  });

  return Marionette.CollectionView.extend({
    itemView: PeopleItemView,

    initialize: function(options) {
      this.addButton = new PeopleAddPersonButtonView();
    },

    onRender: function() {
      console.log("ON RENDER BITCH");
      this.$el.append(this.addButton.render().el);
    }

  });

});
