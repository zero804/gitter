const appEvents = require('../../utils/appevents');
import troupeCollections from '../../collections/instances/troupes';

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
    store.dispatch('updateRoom', newRoom.attributes);
  });
}

export default setupDataBridge;
