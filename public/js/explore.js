require([
  'jquery',
  'utils/appevents',
  'utils/tracking'
], function($, appEvents, tracking) {
  "use strict";

  var ui = {
    tile: $('.js-room-item'),
    form: $('.js-search-form'),
    pills: $('.js-pills'),
    createNew: $('.js-create-new'),
    findOut: $('.js-find-out')
  };

  $(ui.form).on('submit', function (e) {
    appEvents.trigger('track-event', 'explore_searched', {
      searchTerm: e.target.search.value
    });
  });

  $(ui.pills).on('click', function (e) {
    appEvents.trigger('track-event', 'explore_pills_click', {
      tag: e.target.innerText.toLowerCase()
    });
  });

  $(ui.tile).on('click', function (e) {
    appEvents.trigger('track-event', 'explore_room_click');
  });

  $(ui.createNew).on('click', function (e) {
    appEvents.trigger('track-event', 'explore_room_createNew');
  });

  $(ui.findOut).on('click', function (e) {
    appEvents.trigger('track-event', 'explore_room_about');
  });
});
