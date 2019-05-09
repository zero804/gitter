<script>
import { mapState, mapActions } from 'vuex';
import MenuBarItem from './menu-bar-item.vue';

export default {
  name: 'MenuBarItemToggle',
  extends: MenuBarItem,

  computed: {
    ...mapState(['leftMenuPinnedState'])
  },

  methods: {
    ...mapActions(['toggleLeftMenuPinnedState']),
    onClick() {
      this.toggleLeftMenuPinnedState(!this.leftMenuPinnedState);
    }
  }
};
</script>
