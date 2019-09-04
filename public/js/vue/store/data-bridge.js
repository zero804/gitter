const appEvents = require('../../utils/appevents');
const context = require('gitter-web-client-context');

import troupeCollections from '../../collections/instances/troupes';

function setupDataBridge(store) {
  appEvents.on('dispatchVueAction', (actionName, ...args) => {
    store.dispatch(actionName, ...args);
  });

  troupeCollections.troupes.on('add change', newRoom => {
    //console.log('change troupes', newRoom);
    store.dispatch('upsertRoom', newRoom.attributes);
  });

  if (context.inTroupeContext()) {
    const chatCollection = require('../../collections/instances/chats-cached');
    chatCollection.on('sync', () => {
      store.dispatch('addMessages', chatCollection.models.map(m => m.attributes));
    });

    chatCollection.on('add', message => {
      store.dispatch('addMessages', [message.attributes]);
    });
  }
}

export default setupDataBridge;
