const mount = require('../../__test__/vuex-mount');
const momentTimezone = require('moment-timezone');
const {
  createSerializedMessageFixture,
  createSerializedRoomFixture
} = require('../../__test__/fixture-helpers');
const { default: ChatItem } = require('./chat-item.vue');

describe('thread-message-feed chat-item', () => {
  momentTimezone.tz.setDefault('Europe/London');
  const message = createSerializedMessageFixture();
  const defaultProps = {
    message,
    useCompactStyles: false
  };
  const addRoomToStore = store => {
    const room = createSerializedRoomFixture('abc/def');
    store.state.roomMap = { [room.id]: room };
    store.state.displayedRoomId = room.id;
  };

  describe('snapshot', () => {
    it('with default props', () => {
      const { wrapper } = mount(ChatItem, defaultProps, addRoomToStore);
      expect(wrapper.element).toMatchSnapshot();
    });
    it('showing item actions', () => {
      const { wrapper } = mount(
        ChatItem,
        { ...defaultProps, showItemActions: true },
        addRoomToStore
      );
      expect(wrapper.element).toMatchSnapshot();
    });
    it('compact styles', () => {
      const { wrapper } = mount(
        ChatItem,
        { ...defaultProps, useCompactStyles: true },
        addRoomToStore
      );
      expect(wrapper.element).toMatchSnapshot();
    });
    it('error', () => {
      const { wrapper } = mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, error: true }
        },
        addRoomToStore
      );
      expect(wrapper.element).toMatchSnapshot();
    });
    it('loading', () => {
      const { wrapper } = mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, loading: true }
        },
        addRoomToStore
      );
      expect(wrapper.element).toMatchSnapshot();
    });
    it('highlighted - scrolls into view', () => {
      const scrollIntoViewMock = jest.fn();
      const { wrapper } = mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, highlighted: true }
        },
        addRoomToStore,
        { methods: { scrollIntoView: scrollIntoViewMock } }
      );
      expect(wrapper.element).toMatchSnapshot();
      expect(scrollIntoViewMock.mock.calls[0]).toEqual(['smooth', 'center']);
    });
    it('focusedAt - scrolls into view', () => {
      const scrollIntoViewMock = jest.fn();
      mount(
        ChatItem,
        {
          ...defaultProps,
          message: { ...message, focusedAt: 'start' }
        },
        addRoomToStore,
        { methods: { scrollIntoView: scrollIntoViewMock } }
      );
      expect(scrollIntoViewMock.mock.calls[0]).toEqual(['auto', 'start']);
    });
  });
});
