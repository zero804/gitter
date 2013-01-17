/*jshint unused:true browser:true*/
define([
  'marionette',
  'views/base',
  'hbs!./peopleItemView',
  'hbs!./peopleAddPersonButtonView'
], function(Marionette, TroupeViews, peopleItemViewTemplate, peopleAddPersonButtonViewTemplate) {
  "use strict";

  var PeopleItemView = TroupeViews.Base.extend({
    template: peopleItemViewTemplate,

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    }
  });

  var PeopleAddPersonButtonView = TroupeViews.Base.extend({
    template: peopleAddPersonButtonViewTemplate,
    className: 'trpAddButton'
  });

  return Marionette.CollectionView.extend({
    itemView: PeopleItemView,

    initialize: function(/*options*/) {
      this.addButton = new PeopleAddPersonButtonView();
    },

    onRender: function() {
      this.$el.append(this.addButton.render().el);
    }

  });

});
