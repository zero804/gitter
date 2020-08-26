'use strict';

const debug = require('debug-proxy')('app:present-export-user-data-modal');
const appEvents = require('../utils/appevents');

function presentExportUserDataDialog() {
  debug('Starting');

  require.ensure(
    ['../vue/export-data/render-export-user-data-view', '../vue/store/store-instance'],
    function(require) {
      debug('Dependencies loaded');
      const store = require('../vue/store/store-instance');
      const renderExportUserDataView = require('../vue/export-data/render-export-user-data-view')
        .default;

      // Create an element for our export user data view to render into
      document.body.insertAdjacentHTML('beforeend', '<div class="js-export-data-view-root"></div>');

      const exportUserDataViewRootEl = document.querySelector('.js-export-data-view-root');
      if (!exportUserDataViewRootEl) {
        throw new Error('Root element does not exist in DOM for the export user data dialog');
      }

      const vm = renderExportUserDataView(exportUserDataViewRootEl, store);
      debug('Rendered', vm);
      appEvents.trigger('stats.event', 'present-export-user-data-view');

      appEvents.once('destroy-export-user-data-view', () => {
        debug('destroy-export-user-data-view', vm);

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

module.exports = presentExportUserDataDialog;
