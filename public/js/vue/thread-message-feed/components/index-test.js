const mount = require('../../__test__/vuex-mount');
const { createSerializedMessageFixture } = require('../../__test__/fixture-helpers');
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

  describe('child messages', () => {
    it('opened - matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        addParentMessage(store.state);
        addDefaultUser(store.state);
        store.state.threadMessageFeed.isVisible = true;
        store.state.threadMessageFeed.childMessages.results = [
          createSerializedMessageFixture({ id: '1' }),
          createSerializedMessageFixture({ id: '2' })
        ];
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('loading - matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        addParentMessage(store.state);
        addDefaultUser(store.state);
        store.state.threadMessageFeed.isVisible = true;
        store.state.threadMessageFeed.childMessages.loading = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('error - matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        addParentMessage(store.state);
        addDefaultUser(store.state);
        store.state.threadMessageFeed.isVisible = true;
        store.state.threadMessageFeed.childMessages.error = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });
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
