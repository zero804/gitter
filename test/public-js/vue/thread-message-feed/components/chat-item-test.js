'use strict';

const mount = require('../../vuex-mount');
const {
  default: ChatItem
} = require('../../../../../public/js/vue/thread-message-feed/components/chat-item.vue');

describe('thread-message-feed chat-item', () => {
  const defaultProps = {
    message: {
      id: '5d147ea84dad9dfbc522317a',
      text: 'Example message using a bit of  `code` and **bold** to show how *markdown* is stored.',
      html:
        'Example message using a bit of  <code>code</code> and <strong>bold</strong> to show how <em>markdown</em> is stored.',
      sent: '2019-06-27T08:30:32.165Z',
      fromUser: {
        id: '5cdc09f6572f607a5bc8a41d',
        username: 'viktomas_gitlab',
        displayName: 'Tomas Vik',
        url: '/viktomas_gitlab',
        avatarUrl: 'http://localhost:5000/api/private/avatars/g/u/viktomas_gitlab',
        avatarUrlSmall:
          'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=60&d=identicon',
        avatarUrlMedium:
          'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=128&d=identicon',
        v: 29
      }
    }
  };

  it('matches snapshot', () => {
    const { wrapper } = mount(ChatItem, defaultProps);
    expect(wrapper.element).toMatchSnapshot();
  });
});
