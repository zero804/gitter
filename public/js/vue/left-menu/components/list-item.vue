<script>
import { mapActions } from 'vuex';
import LoadingSpinner from '../../components/loading-spinner.vue';
import parseForTemplate from 'gitter-web-shared/parse/left-menu-primary-item';

export default {
  name: 'ListItem',
  components: {
    LoadingSpinner
  },
  props: {
    item: {
      type: Object,
      required: true
    },
    type: {
      type: String,
      default: 'all',
      validator: function(value) {
        // The value must match one of these strings
        return ['all', 'org'].indexOf(value) !== -1;
      }
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    nameData() {
      return parseForTemplate(this.item, this.type);
    }
  },

  methods: {
    ...mapActions(['toggleLeftMenu', 'changeDisplayedRoom']),
    roomClick(room) {
      this.changeDisplayedRoom(room.id);

      // After we choose a room, collapse the left menu if it isn't pinned
      this.toggleLeftMenu(false);
    }
  }
};
</script>

<template>
  <li
    class="list-item"
    :class="{ 'is-favourited': item.favourite }"
    :data-favourite="item.favourite"
  >
    <a
      ref="link"
      class="list-item-link"
      :class="{ 'is-active': active }"
      :href="item.absoluteRoomUri"
      @click.stop.prevent="roomClick(item)"
    >
      <img class="list-item-avatar" :src="item.avatarUrl" />

      <h2 class="list-item-name">
        <template v-if="nameData.namePieces">
          <span v-for="(piece, index) in nameData.namePieces" :key="index" class="name-piece">{{
            piece
          }}</span>
        </template>
        <span v-else-if="nameData.displayName" class="name-piece">{{ nameData.displayName }}</span>
        <span v-else class="name-piece">{{ nameData.name }}</span>
      </h2>

      <loading-spinner v-if="item.loading" />

      <div v-if="item.mentions" class="mention-indicator">@</div>
      <div v-else-if="item.unreadItems" class="unread-indicator">
        {{ item.unreadItems }}
      </div>
    </a>
  </li>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) '../../../../less/components/menu/room/menu-text.less';

.list-item {
  position: relative;

  &.is-favourited {
    // Favourite star
    &:before {
      content: '\e802';
      display: block;
      position: absolute;
      top: 0.9rem;
      left: 1.8rem;
      height: 2rem;
      width: 2rem;
      font-family: fontello;
      color: @menu-favourite-action-color;
      z-index: 0;
      transition: left 0.3s ease-out;
      opacity: 0.5;
    }

    &:hover:before {
      left: 1.6rem;
    }
  }
}

.list-item-link {
  display: flex;
  align-items: center;
  height: @menu-item-height;

  padding-left: @desktop-menu-left-padding / 2;
  padding-right: @desktop-menu-left-padding / 2;

  text-decoration: none;

  &.is-active,
  &:hover,
  &:focus {
    cursor: pointer;
    background-color: @room-item-active-bg;
    color: black;
    outline: none;
  }
}

.list-item-avatar {
  // Cover up the favorite star
  z-index: 0;

  width: @menu-avatar-dims;
  height: @menu-avatar-dims;
  margin-left: @desktop-menu-left-padding / 2;
  margin-right: 1rem;

  background-color: #ffffff;
  border-radius: 0.2rem;
}

.list-item-name {
  .room-menu-text();
  flex: 1;
  display: flex;

  &:first-child {
    margin-left: @desktop-menu-left-padding / 2;
  }
}

.name-piece {
  overflow: hidden;
  min-width: 4ch;
  max-width: 90%;
  max-width: calc(100% ~'-' 1ch);
  flex-basis: auto;
  flex-grow: 0;
  flex-shrink: 1;
  text-overflow: ellipsis;

  transition: flex-shrink 0.2s ease;

  &:hover {
    flex-shrink: 0;
  }

  &:not(:first-child):before {
    content: '/';
  }
}

.indicator-base() {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.4rem;
  height: 2.4rem;

  border-radius: 100%;

  color: #ffffff;
  font-size: 1.1rem;
}

.unread-indicator {
  .indicator-base();
  background-color: @caribbean;
}

.mention-indicator {
  .indicator-base();
  background-color: @jaffa;
}
</style>
