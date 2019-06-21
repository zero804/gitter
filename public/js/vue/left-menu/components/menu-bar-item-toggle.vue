<script>
import { mapState, mapActions } from 'vuex';
import MenuBarItem from './menu-bar-item.vue';

export default {
  name: 'MenuBarItemToggle',
  extends: MenuBarItem,

  computed: {
    ...mapState(['isMobile', 'leftMenuPinnedState', 'leftMenuExpandedState'])
  },

  methods: {
    ...mapActions(['toggleLeftMenuPinnedState', 'toggleLeftMenu']),
    onClick() {
      // Always unpinned on mobile, so you can only expand/collapse
      if (this.isMobile) {
        this.toggleLeftMenu(!this.leftMenuExpandedState);
      } else {
        this.toggleLeftMenuPinnedState(!this.leftMenuPinnedState);
      }
    }
  }
};
</script>
