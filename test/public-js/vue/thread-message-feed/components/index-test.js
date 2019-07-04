'use strict';

const mount = require('../../vuex-mount');
const {
  default: Index
} = require('../../../../../public/js/vue/thread-message-feed/components/index.vue');

describe('thread-message-feed index', () => {
  describe('closed', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.threadMessageFeed.opened = false;
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('opened', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.threadMessageFeed.opened = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('close button calls toggleThreadMessageFeed action', () => {
      const { wrapper, stubbedActions } = mount(Index, {}, store => {
        store.state.threadMessageFeed.opened = true;
      });
      wrapper.find('button').trigger('click');

      expect(stubbedActions.threadMessageFeed.toggle).toHaveBeenCalled();
    });
  });
});
