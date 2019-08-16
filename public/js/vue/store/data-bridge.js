const appEvents = require('../../utils/appevents');
const context = require('gitter-web-client-context');

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

  const useThreadedConversations = context.hasFeature('threaded-conversations');
  function removeMessageIfChild(collection, message) {
    if (message.attributes.parentId) {
      collection.remove(message);
    }
  }

  chatCollection.on('sync', () => {
    store.dispatch('addMessages', chatCollection.models.map(m => m.attributes));
    if (!useThreadedConversations) return;
    chatCollection.models.forEach(m => {
      removeMessageIfChild(chatCollection, m);
    });
  });

  if (useThreadedConversations) {
    chatCollection.on('add', message => {
      store.dispatch('addMessages', [message.attributes]);
      removeMessageIfChild(chatCollection, message);
    });
  }
}

export default setupDataBridge;
