'use strict';

const mount = require('../../vuex-mount');
const { createSerializedMessageFixture } = require('../../fixture-helpers');
const {
  default: Index
} = require('../../../../../public/js/vue/thread-message-feed/components/index.vue');

describe('thread-message-feed index', () => {
  const addDefaultUser = state => (state.user = { displayName: 'John Smith' });
  const addParentMessage = state => {
    const parentMessage = createSerializedMessageFixture();
    state.messageMap = { [parentMessage.id]: parentMessage };
    state.threadMessageFeed.parentId = parentMessage.id;
  };

  it('closed - matches snapshot', async () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.threadMessageFeed.isVisible = false;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('opened - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      addParentMessage(store.state);
      addDefaultUser(store.state);
      store.state.threadMessageFeed.isVisible = true;
      store.state.threadMessageFeed.childMessages = [
        createSerializedMessageFixture({ id: '1' }),
        createSerializedMessageFixture({ id: '2' })
      ];
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('dark theme - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      addParentMessage(store.state);
      addDefaultUser(store.state);
      store.state.threadMessageFeed.isVisible = true;
      store.state.darkTheme = true;
      store.state.threadMessageFeed.childMessages = [];
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('missing parent message - matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      addParentMessage(store.state);
      addDefaultUser(store.state);
      store.state.threadMessageFeed.isVisible = true;
      store.state.messageMap = {};
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
