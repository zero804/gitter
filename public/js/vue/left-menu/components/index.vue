<script>
import { mapState, mapGetters, mapActions } from 'vuex';

import * as leftMenuConstants from '../constants';
import MenuBarBody from './menu-bar-body.vue';
import SearchBody from './search-body.vue';
import RoomList from './room-list.vue';
import iconLogoText from '../../../../images/svg/gitter-logos/logo-white-lettering.svg';

export default {
  name: 'LeftMenu',
  components: {
    MenuBarBody,
    SearchBody,
    RoomList
  },
  iconLogoText,
  computed: {
    ...mapState(['test', 'leftMenuState', 'leftMenuPinnedState', 'leftMenuExpandedState']),
    ...mapGetters(['displayedRooms']),
    isPinned() {
      return this.leftMenuPinnedState === true;
    },
    isExpanded() {
      return this.leftMenuExpandedState === true;
    },
    isAllState() {
      return this.leftMenuState === leftMenuConstants.LEFT_MENU_ALL_STATE;
    },
    isSearchState() {
      return this.leftMenuState === leftMenuConstants.LEFT_MENU_SEARCH_STATE;
    },
    isPeopleState() {
      return this.leftMenuState === leftMenuConstants.LEFT_MENU_PEOPLE_STATE;
    }
  },

  methods: {
    ...mapActions(['toggleLeftMenu']),
    onMouseleave() {
      this.toggleLeftMenu(false);
    }
  }
};
</script>

<template>
  <div
    ref="root"
    class="root js-left-menu-root"
    :class="{ unpinned: !isPinned, expanded: isExpanded }"
    @mouseleave="onMouseleave"
  >
    <header class="header">
      <section class="header-minibar layout-minibar">
        <svg
          class="logo-gitter-sign"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 18 25"
        >
          <rect x="15" y="5" width="2" height="10" />
          <rect x="10" y="5" width="2" height="20" />
          <rect x="5" y="5" width="2" height="20" />
          <rect width="2" height="15" />
        </svg>
      </section>
      <section class="header-main-menu layout-main-menu">
        <span class="logo-text" v-html="$options.iconLogoText"></span>
      </section>
    </header>

    <section class="body">
      <section class="layout-minibar">
        <menu-bar-body />
      </section>
      <section class="body-main-menu layout-main-menu">
        <div class="hide">
          {{ test }}
        </div>

        <search-body v-if="isSearchState" />
        <template v-else>
          <h2 v-if="isAllState" class="room-list-title">All conversations</h2>
          <h2 v-if="isPeopleState" class="room-list-title">People</h2>

          <room-list :rooms="displayedRooms" />
        </template>
      </section>
    </section>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'base-zindex-levels';
@import (reference) 'components/menu/room/header-title';

.root {
  box-sizing: border-box;
  z-index: @zIndexLeftMenu;
  display: flex;
  flex-direction: column;
  height: 100%;

  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }
}

.layout-minibar {
  z-index: 1;
  width: 7.5rem;
}

.layout-main-menu {
  width: 26.5rem;

  .unpinned & {
    position: absolute;
    left: 7.5rem;

    transform: translateX(-100%);
  }

  .unpinned.expanded & {
    transform: translateX(0%);
  }
}

.header {
  position: relative;
  display: flex;
  flex-shrink: 0;
  height: @desktop-header-height;

  color: rgba(255, 255, 255, 0.5);
}

.header-minibar {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;

  background-color: @header-base-bg-color;
}

.header-main-menu {
  display: flex;
  align-items: center;
  height: 100%;

  background-color: @header-base-bg-color;
}

.logo-gitter-sign {
  display: block;
  width: 18px;

  fill: currentColor;
}

.logo-text {
  display: block;
  width: 7rem;

  // Because there is some specific styles in the SVG itself for the legacy menu
  opacity: 0.5;
}

.body {
  position: relative;
  flex: 1;
  display: flex;
}

.body-main-menu {
  overflow-x: hidden;
  overflow-y: auto;
  height: 100%;

  background-color: @main-application-bg-color;
  border-right: 1px solid @menu-border-color;
}

.room-list-title {
  .m-header-title();
}
</style>
