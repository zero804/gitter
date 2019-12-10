const mount = require('../../__test__/vuex-mount');
const { default: ChatItemActions } = require('./chat-item-actions.vue');
const { createSerializedMessageFixture } = require('../../__test__/fixture-helpers');

jest.mock('gitter-web-client-context');
const context = require('gitter-web-client-context');

describe('thread-message-feed chat-item-actions', () => {
  const message = createSerializedMessageFixture();

  beforeEach(() => {
    context.mockReset();
    context.mockImplementation(() => ({}));
  });

  it('matches snapshot', () => {
    const { wrapper } = mount(ChatItemActions, { message });
    expect(wrapper.element).toMatchSnapshot();
  });

  describe('user can delete the message', () => {
    beforeEach(() => {
      context.getUserId.mockImplementation(function() {
        return message.fromUser.id;
      });
    });

    it('matches snapshot', () => {
      const { wrapper } = mount(ChatItemActions, { message });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('triggers delete action when delete option is clicked', () => {
      const { wrapper, stubbedActions } = mount(ChatItemActions, { message });
      // removing the original implementation to prevent an API call
      stubbedActions.threadMessageFeed.deleteMessage.mockImplementation(() => {});
      wrapper.find('.js-chat-item-delete-action').trigger('click');
      expect(stubbedActions.threadMessageFeed.deleteMessage).toHaveBeenCalled();
    });
  });

  describe('user can edit the message', () => {
    const testMessage = createSerializedMessageFixture({ sent: new Date().toISOString() });
    beforeEach(() => {
      context.getUserId.mockImplementation(function() {
        return testMessage.fromUser.id;
      });
    });

    it('matches snapshot', () => {
      const { wrapper } = mount(ChatItemActions, { message: testMessage });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('triggers edit action when edit option is clicked', () => {
      const { wrapper, stubbedActions } = mount(ChatItemActions, { message: testMessage });
      // removing the original implementation to prevent an API call
      stubbedActions.threadMessageFeed.editMessage.mockImplementation(() => {});
      wrapper.find('.js-chat-item-edit-action').trigger('click');
      expect(stubbedActions.threadMessageFeed.editMessage).toHaveBeenCalled();
    });
  });
});
