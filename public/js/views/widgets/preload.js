/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  './avatar',
  './timeago',
  './troupeAvatar'
], function(TroupeViews, AvatarWidget, TimeAgoWidget, TroupeAvatarWidget) {
  "use strict";

  TroupeViews.preloadWidgets({
    avatar: AvatarWidget,
    timeago: TimeAgoWidget,
    troupeAvatar: TroupeAvatarWidget
  });
});
