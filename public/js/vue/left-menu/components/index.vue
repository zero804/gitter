<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'LeftMenu',
  computed: {
    ...mapState({
      test: state => state.test
    })
  }
};
</script>

<template>
  <div class="root js-left-menu-root">
    left menu root
    <div>
      {{ test }}
    </div>
  </div>
</template>

<style lang="less" scoped>
@import 'trp3Vars';

.root {
  z-index: 9999;
  position: absolute;
  background-color: #f00;
}
</style>
