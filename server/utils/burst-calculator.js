'use strict';

/**
 * setBurstFinal() sets the final burst class for the previous chat item once a new burst happens
 *
 * chatItem `Object` chat-item to be set as burst final
 * void
 */
var setBurstFinal = function(chatItem) {
  chatItem.burstFinal = true;
};

/**
 * IMPORTANT: this version differs from client-side calculateBursts() due to backbone access methods!
 * calculateBursts() calculates what chat messages are 'bursts'.
 *
 * `Array` chats - the collection of chat messages
 * returns the modified chats array
 */
var calculateBursts = function(chats) {
  // console.time('calculateBursts'); // benchmarking
  /* @const - time window, in which an user can keep adding chat items as part of a initial "burst" */
  var BURST_WINDOW = 5 * 60 * 1000; // 5 minutes

  var burstUser, burstStart;

  chats.forEach(function(chat, index) {
    var newUser = chat.fromUser && chat.fromUser.username;
    var newSentTime = chat.sent;

    // if message is a me status
    if (chat.status) {
      burstUser = null;
      chat.burstStart = true;
      if (index !== 0) setBurstFinal(chats[index - 1]);
      return;
    }

    // if the message is by a there is not a burst user then we're starting a burst
    if (!burstUser) {
      burstUser = newUser;
      burstStart = newSentTime;
      chat.burstStart = true;
      if (index !== 0) setBurstFinal(chats[index - 1]);
      return;
    }

    // get the duration since last burst
    var durationSinceBurstStart = new Date(newSentTime) - new Date(burstStart);

    // if the current user is different or the duration since last burst is larger than 5 minutes we have a new burst
    if (newUser !== burstUser || durationSinceBurstStart > BURST_WINDOW) {
      burstUser = newUser;
      burstStart = newSentTime;
      chat.burstStart = true;
      if (index !== 0) setBurstFinal(chats[index - 1]);
      return;
    }

    // most messages won't be a burst
    chat.burstStart = false;
  });
  return chats;
  // console.timeEnd('calculateBursts');
};

module.exports = calculateBursts;
