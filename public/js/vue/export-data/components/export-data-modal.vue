<script>
export default {
  name: 'ExportDataModal',
  props: {
    title: {
      type: String,
      required: true
    }
  },
  methods: {
    onCloseClicked() {
      this.$emit('exitModal');
    }
  }
};
</script>

<template>
  <div ref="root" class="root modal-backdrop js-export-data-view-root" @click="onCloseClicked">
    <div ref="modal" class="modal--default" @click.stop>
      <header class="modal--default__header">
        <h1 class="modal--default__header__title js-modal-title-text">{{ title }}</h1>
        <span
          ref="closeButton"
          class="modal--default__header__icon icon-cancel-circle"
          data-action="close"
          @click="onCloseClicked"
        ></span>
      </header>

      <section class="modal--default__content">
        <slot></slot>
      </section>

      <footer class="modal--default__footer-wrapper">
        <div class="modal--default__footer"></div>
      </footer>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'colors';
@import (reference) 'base-zindex-levels';

.root {
  box-sizing: border-box;

  z-index: @zIndexCommunityCreate;
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;

  overflow-x: hidden;
  overflow-y: auto;

  display: flex;
  justify-content: center;
  align-items: center;

  &::v-deep *,
  &::v-deep *:before,
  &::v-deep *:after {
    box-sizing: inherit;
  }
}

.modal--default__content {
  &::v-deep {
    a {
      text-decoration: underline;
    }

    .export-rate-limit-note {
      margin-top: 0;
    }

    .heading {
      margin-bottom: 0.5em;
    }

    .export-link-list {
      & > li {
        margin-bottom: 0.3em;
      }
    }
  }
}
</style>
