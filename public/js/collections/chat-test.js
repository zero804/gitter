'use strict';

const chatModels = require('./chat');

describe('chatCollection', () => {
  it('should store a message', () => {
    const chatCollection = new chatModels.ChatCollection(null, { listen: true });
    chatCollection.add({
      id: '5d36e5dac923de7b3af717a1',
      text: 'hello',
      sent: new Date(),
      burstStart: true
    });
    expect(chatCollection.length).toEqual(1);
  });
});
