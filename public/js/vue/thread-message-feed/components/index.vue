<script>
import { mapState, mapGetters } from 'vuex';
import ThreadHeader from './thread-header.vue';
import ChatInput from './chat-input.vue';
import ChatItem from './chat-item.vue';

export default {
  name: 'ThreadMessageFeed',
  components: {
    ChatInput,
    ThreadHeader,
    ChatItem
  },
  computed: {
    ...mapGetters({ parentMessage: 'threadMessageFeed/parentMessage' }),
    ...mapState({
      isVisible: state => state.threadMessageFeed.isVisible,
      user: 'user',
      darkTheme: 'darkTheme'
    })
  }
};
</script>

<template>
  <div
    class="js-thread-message-feed-root root"
    :class="{ opened: isVisible, 'dark-theme': darkTheme }"
  >
    <section v-if="isVisible" class="body">
      <thread-header />
      <section v-if="parentMessage" class="content">
        <div class="chat-messages">
          <chat-item :message="parentMessage" :use-compact-styles="true" />
        </div>
        <chat-input :user="user" thread />
      </section>
      <section v-else class="content">
        <span class="error-text">
          Error: The message for this thread is unavailable. It was probably deleted.
        </span>
      </section>
    </section>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) 'trp3Vars';
@import (reference) 'components/right-toolbar';
@import (reference) 'dark-theme';

.root {
  .right-toolbar-position();

  display: none;
  &.opened {
    display: flex;
  }
  width: @right-toolbar-full-width;

  color: @trpDarkGrey;
  text-align: left;

  box-sizing: border-box;
  &::v-deep *,
  &::v-deep *:before,
  &::v-deep *:after {
    box-sizing: inherit;
  }
}

.body {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  background-color: @main-application-bg-color;
  border-left: 1px solid @menu-border-color;
  .dark-theme & {
    background-color: @dark-theme-thread-message-feed-bg-color;
    border-left-color: @dark-theme-thread-message-feed-left-border-color;
  }
}

.content {
  display: flex;
  flex-direction: column;
  height: 100%;
  .error-text {
    margin: @thread-message-feed-padding;
  }
}

.chat-messages {
  width: 100%;
  height: 100%;
  display: inline-block;
  overflow: auto;
}
</style>
