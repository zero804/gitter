import Vue from 'vue';
import RoomExportModal from './components/room-export-modal.vue';

function renderExportRoomDataView(el, store, props) {
  return new Vue({
    el,
    store,
    components: {
      RoomExportModal
    },
    render(createElement) {
      return createElement('room-export-modal', {
        props
      });
    }
  });
}

export default renderExportRoomDataView;
