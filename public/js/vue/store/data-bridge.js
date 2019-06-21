import Vue from 'vue';

import troupeCollections from '../../collections/instances/troupes';

function setupDataBridge(store) {
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
