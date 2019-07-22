'use strict';

const mount = require('../../vuex-mount');
const {
  default: Index
} = require('../../../../../public/js/vue/thread-message-feed/components/index.vue');

describe('thread-message-feed index', () => {
  const addDefaultUser = state => (state.user = { displayName: 'John Smith' });
  const addParentMessage = state => {
    const parentMessage = {
      id: '5d147ea84dad9dfbc522317a'
    };
    state.threadMessageFeed.parentMessage = parentMessage;
  };

  it('closed - matches snapshot', async () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.threadMessageFeed.isVisible = false;
      // Further state changes shouldn't be necessary but for some reason the `mount` helper
      // tries to render the v-if hidden child components as well and causes Vue warnings
      addParentMessage(store.state);
      addDefaultUser(store.state);
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('opened - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      addParentMessage(store.state);
      addDefaultUser(store.state);
      store.state.threadMessageFeed.isVisible = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('dark theme - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      addParentMessage(store.state);
      addDefaultUser(store.state);
      store.state.threadMessageFeed.isVisible = true;
      store.state.darkTheme = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
