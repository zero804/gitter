'use strict';

const mount = require('../../vuex-mount');
const {
  default: Index
} = require('../../../../../public/js/vue/thread-message-feed/components/index.vue');

describe('thread-message-feed index', () => {
  const addDefaultUser = state => (state.user = { displayName: 'John Smith' });

  it('closed - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.threadMessageFeed.isVisible = false;
      addDefaultUser(store.state);
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('opened - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.threadMessageFeed.isVisible = true;
      addDefaultUser(store.state);
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('dark theme - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.threadMessageFeed.isVisible = true;
      store.state.darkTheme = true;
      addDefaultUser(store.state);
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
