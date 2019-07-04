const appEvents = require('../../../utils/appevents');

// Exported for testing
export const types = {
  TOGGLE_THREAD_MESSAGE_FEED: 'TOGGLE_THREAD_MESSAGE_FEED'
};

export default {
  namespaced: true,
  state: {
    isVisible: false
  },
  mutations: {
    [types.TOGGLE_THREAD_MESSAGE_FEED](state, isVisible) {
      state.isVisible = isVisible;
    }
  },
  actions: {
    toggle: ({ commit }, isVisible) => {
      commit(types.TOGGLE_THREAD_MESSAGE_FEED, isVisible);
      appEvents.trigger('vue:right-toolbar:toggle', !isVisible);
    }
  }
};
