<script>
import { mapState, mapActions } from 'vuex';

import * as leftMenuConstants from '../constants';

export default {
  name: 'MenuBarItem',
  props: {
    type: {
      type: String,
      required: true,
      validator: function(value) {
        // The value must match one of these strings
        return (
          [
            leftMenuConstants.LEFT_MENU_ALL_STATE,
            leftMenuConstants.LEFT_MENU_SEARCH_STATE,
            leftMenuConstants.LEFT_MENU_PEOPLE_STATE,
            leftMenuConstants.LEFT_MENU_GROUP_STATE,
            leftMenuConstants.LEFT_MENU_CREATE_STATE,
            leftMenuConstants.LEFT_MENU_TOGGLE_STATE
          ].indexOf(value) !== -1
        );
      }
    }
  },
  computed: {
    ...mapState(['leftMenuState']),
    itemTypeClass() {
      return `item-${this.type}`;
    },
    isActive() {
      return this.type === this.leftMenuState;
    }
  },

  methods: {
    ...mapActions(['setLeftMenuState', 'toggleLeftMenu']),
    onClick(type) {
      // Change the left menu view
      this.setLeftMenuState(type);
      // Expand the left menu if it isn't pinned so you can see the room list
      this.toggleLeftMenu(true);
    }
  }
};
</script>

<template>
  <button
    ref="root"
    class="item"
    :class="{
      [itemTypeClass]: true,
      active: isActive
    }"
    type="button"
    @click.prevent="onClick(type)"
  >
    <span class="icon-wrapper">
      <slot name="icon"></slot>
    </span>
  </button>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';

.item {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: @desktop-header-height;

  background: transparent;
  border: 0;

  &:hover,
  &:focus {
    background-color: @room-item-active-bg;
    outline: none;
  }

  &:before {
    content: '';
    display: inline-block;
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0.5rem;
    transform: translateX(-100%);
    transition: transform 0.2s linear;
  }

  &.active {
    &:before {
      transform: translateX(0);
      background-color: currentColor;
    }
  }
}

.item-all {
  color: @ruby;
}

.item-search {
  color: @jaffa;
}

.item-people {
  color: @people-bg;
}

.item-group {
  color: @caribbean;
}

.item-create {
  color: #7f8080;
}

.item-toggle {
  & .icon-wrapper {
    width: 30px;
    height: 34px;

    & > svg {
      stroke-width: 1px;
    }
  }
}

.icon-wrapper {
  width: 22px;
  height: 22px;

  & > svg {
    width: 100%;
    height: 100%;

    fill: #7f8080;
    stroke: #7f8080;
    stroke-width: 0.5px;
    vector-effect: non-scaling-stroke;
  }
}
</style>
