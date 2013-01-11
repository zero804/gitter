define([
  'marionette',
  'views/base',
  'hbs!./peopleItemView'
], function(Marionette, TroupeViews, peopleItemViewTemplate) {
  /*jslint browser: true*/
  /*global require */
  "use strict";

  var PeopleItemView = TroupeViews.Base.extend({
    template: peopleItemViewTemplate
  });

  return Marionette.CollectionView.extend({
    itemView: PeopleItemView
  });

});
