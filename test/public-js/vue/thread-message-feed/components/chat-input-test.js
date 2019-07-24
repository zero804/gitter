'use strict';

const mount = require('../../vuex-mount');
const {
  default: ChatInput
} = require('../../../../../public/js/vue/thread-message-feed/components/chat-input.vue');

describe('thread-message-feed chat-input', () => {
  const defaultProps = {
    user: { displayName: 'John Smith' },
    thread: true
  };

  it('matches snapshot for thread', () => {
    const { wrapper } = mount(ChatInput, defaultProps);
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('sending message', () => {
    it('should update draft message when user adds input', () => {
      const { wrapper, stubbedActions } = mount(ChatInput, defaultProps);
      wrapper.find({ ref: 'chat-input' }).element.value = 'hello';
      wrapper.find({ ref: 'chat-input' }).trigger('input');
      expect(stubbedActions.threadMessageFeed.updateDraftMessage).toHaveBeenCalledWith(
        expect.anything(),
        'hello',
        undefined
      );
    });

    it('should render draft message when it is in state', () => {
      const { wrapper } = mount(
        ChatInput,
        defaultProps,
        store => (store.state.threadMessageFeed.draftMessage = 'new message')
      );
      expect(wrapper.find({ ref: 'chat-input' }).element.value).toEqual('new message');
    });

    it('should trigger send action when enter key is pressed', () => {
      const { wrapper, stubbedActions } = mount(
        ChatInput,
        defaultProps,
        store => (store.state.threadMessageFeed.chatCollection = { create: jest.fn() })
      );
      wrapper.find({ ref: 'chat-input' }).trigger('keydown.enter');
      expect(stubbedActions.threadMessageFeed.sendMessage).toHaveBeenCalled();
    });
  });
});
