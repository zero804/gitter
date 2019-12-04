<script>
import { mapActions } from 'vuex';
const context = require('gitter-web-client-context');
const ChatItemPolicy = require('../../../views/chat/chat-item-policy');
import { BPopover } from 'bootstrap-vue';

export default {
  name: 'ChatItemActions',
  components: { BPopover },
  props: {
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
    chatItemPolicy: function() {
      return new ChatItemPolicy(this.message, {
        isEmbedded: context().embedded,
        currentUserId: context.getUserId(),
        isTroupeAdmin: context.isTroupeAdmin()
      });
    },
    chatActionsId: function() {
      return `chat-actions-${this.message.id}`;
    }
  },

  methods: {
    ...mapActions({
      deleteMessage: 'threadMessageFeed/deleteMessage'
    })
  }
};
</script>

<template>
  <div class="chat-item__actions">
    <b-popover
      :target="chatActionsId"
      triggers="click blur"
      delay="0"
      placement="left"
      title=""
      custom-class="chat-item-actions-popover"
    >
      <div class="popover-item__action-disabled">
        Edit
      </div>

      <button
        v-if="chatItemPolicy.canDelete()"
        class="popover-item__action"
        title="Delete this message"
        @click="deleteMessage(message)"
      >
        Delete
      </button>
      <div v-else class="popover-item__action-disabled">Delete</div>
    </b-popover>
    <button
      :id="chatActionsId"
      ref="actionButton"
      class="chat-item-actions-button"
      @click="$refs.actionButton.focus()"
    >
      <i class="chat-item__icon icon-ellipsis"></i>
    </button>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';

.remove-button-styles {
  border: none;
  background: inherit;
  color: inherit;
  line-height: inherit;
  font-size: inherit;
  &:focus {
    outline: 0;
  }
}
.chat-item-actions-button {
  .remove-button-styles();
  padding: 0px;
  &:focus {
    .chat-item__icon {
      visibility: visible;
      color: @blue;
    }
  }
}
.chat-item-actions-popover::v-deep .popover-body {
  width: 70px;
}
.popover-item__action {
  .remove-button-styles();
  width: 100%;
  text-align: left;
  &:hover {
    background: #08c;
    color: white;
  }
}
</style>
