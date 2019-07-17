<script>
import Avatar from './avatar.vue';

export default {
  name: 'ChatItem',
  components: { Avatar },
  props: {
    showItemActions: {
      type: Boolean,
      default: false
    },
    message: {
      type: Object,
      required: true
    }
  }
};
</script>

<template>
  <div class="chat-item">
    <div class="chat-item__container">
      <div class="chat-item__aside">
        <div class="chat-item__avatar">
          <avatar :user="message.fromUser" />
        </div>
      </div>
      <div v-if="showItemActions" class="chat-item__actions js-chat-item-actions">
        <i class="chat-item__icon icon-check chat-item__icon--read js-chat-item-readby"></i>
        <i class="chat-item__icon icon-ellipsis"></i>
      </div>
      <div class="chat-item__content">
        <div class="chat-item__details">
          <div class="chat-item__from js-chat-item-from">{{ message.fromUser.displayName }}</div>
          <div class="chat-item__username js-chat-item-from">@{{ message.fromUser.username }}</div>
          <!--
      <a class='chat-item__time js-chat-time' {{#if permalinkUrl}} href='{{permalinkUrl}}'{{/if}} title="{{ sentTimeFormattedFull }}">{{ sentTimeFormatted }}</a>
      -->
        </div>
        <div v-html="message.html" class="chat-item__text js-chat-item-text"></div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'trp3Chat';
@import (reference) 'colors';
@import (reference) 'typography';
@import 'public/js/views/chat/chatItemView.less';
</style>
