define([
  'marionette',
  'views/widgets/avatar'
], function(Marionette, AvatarView) {
  /*jslint browser: true*/
  /*global require */
  "use strict";

  return Marionette.CollectionView.extend({
    itemView: AvatarView
  });

});
