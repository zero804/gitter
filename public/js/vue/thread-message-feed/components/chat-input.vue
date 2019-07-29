<script>
import { mapState, mapActions } from 'vuex';
import Avatar from './avatar.vue';

export default {
  name: 'ChatInput',
  components: {
    Avatar
  },
  props: {
    user: {
      type: Object,
      required: true
    },
    roomMember: {
      type: Boolean,
      default: true
    },
    isMobile: {
      type: Boolean,
      dafault: false
    },
    thread: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState({
      draftMessage: state => state.threadMessageFeed.draftMessage
    }),
    draftMessageModel: {
      get() {
        return this.draftMessage;
      },
      set(newDraftMessage) {
        this.updateDraftMessage(newDraftMessage);
      }
    },
    placeholder() {
      return this.isMobile
        ? 'Touch here to type a chat message.'
        : 'Click here to type a chat message.';
    }
  },
  methods: {
    ...mapActions({
      sendMessage: 'threadMessageFeed/sendMessage',
      updateDraftMessage: 'threadMessageFeed/updateDraftMessage'
    }),
    textAreaChanged(event) {
      this.updateDraftMessage(event.target.value);
    }
  }
};
</script>

<template>
  <footer id="chat-input-wrapper" class="chat-input" :class="{ thread }">
    <div v-if="user" class="chat-input__container js-chat-input-container">
      <div v-if="roomMember" class="chat-input__area">
        <div class="chat-input__avatar">
          <avatar :user="user" />
        </div>
        <div id="chat-input-box-region" class="chat-input-box__region">
          <form class="chat-input__box" name="chat">
            <textarea
              ref="chat-input"
              v-model="draftMessageModel"
              class="chat-input__text-area"
              name="chat"
              autocomplete="off"
              :placeholder="placeholder"
              autocorrect="off"
              autofocus
              maxlength="4096"
              @keydown.enter.prevent="sendMessage()"
            ></textarea>
          </form>
        </div>
      </div>
      <!-- TODO: Add Join room button for main thread feed + mobile view -->
    </div>
  </footer>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'colors';
@import (reference) 'dark-theme';
@import (reference) 'mixins/text/default-fonts';
@import 'public/js/views/chat/chatInputView.less';

.thread.chat-input {
  .dark-theme & {
    background-color: @dark-theme-thread-message-feed-bg-color;
  }
}

.thread .chat-input__container {
  margin-left: @thread-message-feed-padding;
}

.thread .chat-input__box {
  margin-left: @avatarWidth + @thread-message-feed-padding;
  margin-right: @thread-message-feed-padding;
}

.thread .chat-input__text-area {
  .dark-theme & {
    background-color: @dark-theme-thread-message-feed-bg-color;
  }
}
</style>
