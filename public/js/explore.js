require([
  'jquery',
  'utils/appevents',
  'utils/tracking'
], function($, appEvents, tracking) {
  "use strict";

  $('.room-item').on('click', function (e) {
    appEvents.trigger('track-event', 'explore_room_click');
  });

});
