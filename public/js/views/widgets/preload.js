define([
  'views/base',
  './avatar',
  './timeago'
], function(TroupeViews, AvatarWidget, TimeAgoWidget) {
  "use strict";

  TroupeViews.preloadWidgets({
    avatar: AvatarWidget,
    timeago: TimeAgoWidget
  });
});
