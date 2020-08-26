import Vue from 'vue';
import UserExportModal from './components/user-export-modal.vue';

function renderExportUserDataView(el, store) {
  return new Vue({
    el,
    store,
    components: {
      UserExportModal
    },
    render(createElement) {
      return createElement('user-export-modal', {});
    }
  });
}

export default renderExportUserDataView;
