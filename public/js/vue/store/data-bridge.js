const appEvents = require('../../utils/appevents');

import troupeCollections from '../../collections/instances/troupes';
import chatCollection from '../../collections/instances/chats-cached';

function setupDataBridge(store) {
  appEvents.on('dispatchVueAction', (actionName, ...args) => {
    store.dispatch(actionName, ...args);
  });

  /* * /
  troupeCollections.troupes.on('all', (...args) => {
    console.log('all troupes', args);
  });
  /* */

  troupeCollections.troupes.on('add change', newRoom => {
    //console.log('change troupes', newRoom);
    store.dispatch('upsertRoom', newRoom.attributes);
  });

  chatCollection.on('sync', () => {
    store.dispatch('addMessages', chatCollection.models.map(m => m.attributes));
  });

  chatCollection.on('add', message => {
    store.dispatch('addMessages', [message.attributes]);
  });
}

export default setupDataBridge;
