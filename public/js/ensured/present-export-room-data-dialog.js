'use strict';

const debug = require('debug-proxy')('app:present-export-room-data-modal');
const appEvents = require('../utils/appevents');

function presentExportRoomDataDialog(room) {
  debug('Starting');

  require.ensure(
    ['../vue/export-data/render-export-room-data-view', '../vue/store/store-instance'],
    function(require) {
      debug('Dependencies loaded');
      const store = require('../vue/store/store-instance');
      const renderExportRoomDataView = require('../vue/export-data/render-export-room-data-view')
        .default;

      // Create an element for our export room data view to render into
      document.body.insertAdjacentHTML('beforeend', '<div class="js-export-data-view-root"></div>');

      const exportRoomDataViewRootEl = document.querySelector('.js-export-data-view-root');
      if (!exportRoomDataViewRootEl) {
        throw new Error('Root element does not exist in DOM for the export room data dialog');
      }

      const vm = renderExportRoomDataView(exportRoomDataViewRootEl, store, {
        roomId: room.id
      });
      debug('Rendered', vm);
      appEvents.trigger('stats.event', 'present-export-room-data-view');

      appEvents.once('destroy-export-room-data-view', () => {
        debug('destroy-export-room-data-view', vm);

        // Destroy the vue listeners, etc
        vm.$destroy();
        // Remove the element from the DOM
        vm.$el.parentNode.removeChild(vm.$el);

        // Change the URL back to `#`
        appEvents.trigger('route', '');
      });
    }
  );
}

module.exports = presentExportRoomDataDialog;
