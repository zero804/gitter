<script>
import Avatar from './avatar.vue';
import LoadingSpinner from '../../components/loading-spinner.vue';
const timeFormat = require('gitter-web-shared/time/time-format');
const fullTimeFormat = require('gitter-web-shared/time/full-time-format');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');
const pushState = require('../../../utils/browser/pushState');

export default {
  name: 'ChatItem',
  components: { Avatar, LoadingSpinner },
  props: {
    showItemActions: {
      type: Boolean,
      default: false
    },
    message: {
      type: Object,
      required: true
    },
    useCompactStyles: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    sentTimeFormatted: function() {
      return timeFormat(this.message.sent);
    },
    sentTimeFormattedFull: function() {
      return fullTimeFormat(this.message.sent);
    },
    permalinkUrl: function() {
      const troupeUri = this.$store.getters.displayedRoom.uri;
      return generatePermalink(troupeUri, this.message.id, this.message.sent);
    }
  },
  watch: {
    message: function(newMessage, oldMessage) {
      if (newMessage.highlighted && !oldMessage.highlighted) {
        this.scrollIntoView();
      }
    }
  },
  mounted: function() {
    if (this.message.highlighted) this.scrollIntoView();
  },
  methods: {
    setPermalinkLocation: function() {
      pushState(this.permalinkUrl);
    },
    scrollIntoView: function() {
      this.$el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
};
</script>

<template>
  <div
    class="chat-item burstStart"
    :class="{
      compact: useCompactStyles,
      syncerror: message.error,
      'chat-item__highlighted': message.highlighted
    }"
  >
    <div class="chat-item__container">
      <div class="chat-item__aside">
        <div class="chat-item__avatar">
          <avatar :user="message.fromUser" />
        </div>
      </div>
      <div v-if="showItemActions" class="chat-item__actions">
        <i class="chat-item__icon icon-check chat-item__icon--read"></i>
        <i class="chat-item__icon icon-ellipsis"></i>
      </div>
      <div class="chat-item__content">
        <div class="chat-item__details">
          <div class="chat-item__from">{{ message.fromUser.displayName }}</div>
          <div class="chat-item__username">@{{ message.fromUser.username }}</div>
          <a
            class="chat-item__time"
            :href="permalinkUrl"
            :title="sentTimeFormattedFull"
            @click.stop.prevent="setPermalinkLocation"
            >{{ sentTimeFormatted }}</a
          >
          <loading-spinner v-if="message.loading" class="message-loading-icon" />
        </div>
        <div v-if="message.html" class="chat-item__text" v-html="message.html"></div>
        <div v-else class="chat-item__text">{{ message.text }}</div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'trp3Chat';
@import (reference) 'colors';
@import (reference) 'typography';
@import (reference) 'dark-theme';
@import (reference) '../styles/variables';
@import (reference) 'public/js/views/chat/chatItemView.less';

@item-detail-margin: 2px;

.chat-item__details {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  // inspired by https://stackoverflow.com/questions/20626685/better-way-to-set-distance-between-flexbox-items
  margin-left: -@item-detail-margin;
  margin-right: -@item-detail-margin;
}
.chat-item__from,
.chat-item__username,
.chat-item__time {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-left: @item-detail-margin;
  margin-right: @item-detail-margin;
}

.compact .chat-item__container {
  padding-left: 0px;
}

.compact .chat-item__content {
  margin-left: @thread-chat-item-compact-left-margin;
  margin-right: @thread-message-feed-padding;
}

.dark-theme .chat-item__text {
  color: @dark-theme-chat-main-text-color;
}

.message-loading-icon {
  margin: 4px;
}
</style>
