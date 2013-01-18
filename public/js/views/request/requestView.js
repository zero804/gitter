define([
  'marionette',
  'hbs!./request'
], function(Marionette, RequestItemView) {

  return Marionette.CollectionView.extend({
    itemView: RequestItemView
  });
});