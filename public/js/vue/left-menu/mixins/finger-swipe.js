const { mapActions } = require('vuex');
const raf = require('../../../utils/raf');

const SWIPE_THRESHOLD = 5;
const INTENT_THRESHOLD = 15;

const fingerSwipeMixin = {
  data() {
    return {
      rafTimeoutAnimateLeftMenuFingerSwipe: null,
      // We do not change the left-menu width
      // This is only to reference the width in the methods
      leftMenuWidth: null,
      // Stores the X position where the touch starts
      touchStartX: null,
      // Stores the X position where the touch is currently at
      touchCurrentX: null,
      // Stores the X position where the touch begins to go in one direction.
      // If the user changes direction in the middle of a touch,
      // we store where the X position where they changed direction.
      //
      // We use this to determine the users intention and finish off their swipe
      // to completely expand/collapse the left-menu based on their direction intention
      directionStartX: null,
      transformCssValue: '',
      transitionCssValue: ''
    };
  },
  methods: {
    ...mapActions(['toggleLeftMenu']),
    // via https://stackoverflow.com/a/11409944/796832
    clamp(num, min, max) {
      return Math.min(Math.max(num, min), max);
    },

    animateLeftMenuFingerSwipe() {
      // No transition while we animate with JavaScript
      // If we leave the transition in place, the UI looks laggy and a bunch of repaints happen
      this.transitionCssValue = 'none';

      if (this.isExpanded) {
        this.transformCssValue = `translateX(calc(0% - ${this.clamp(
          this.touchStartX - this.touchCurrentX,
          0,
          this.leftMenuWidth
        )}px))`;
      } else {
        this.transformCssValue = `translateX(calc(-100% + ${this.clamp(
          -1 * (this.touchStartX - this.touchCurrentX),
          0,
          this.leftMenuWidth
        )}px))`;
      }
    },
    animateStop() {
      // If someone finger swiped past our intent deadzone threshold,
      // then expand/collapse in whatever direction they were aiming for
      if (
        this.directionStartX &&
        this.touchCurrentX &&
        Math.abs(this.directionStartX - this.touchCurrentX) > INTENT_THRESHOLD
      ) {
        if (this.directionStartX - this.touchCurrentX > 0) {
          this.toggleLeftMenu(false);
        } else {
          this.toggleLeftMenu(true);
        }
      }

      // Reset all of our JavaScript driven CSS properties we set while animating
      // so the normal CSS can take over
      this.transformCssValue = '';
      this.transitionCssValue = '';

      // Reset the touch details
      this.touchStartX = null;
      this.touchCurrentX = null;
      this.directionStartX = null;

      // Clear up any enqueued animation since the touch is done, the final state is already set above
      if (this.rafTimeoutAnimateLeftMenuFingerSwipe) {
        raf.cancel(this.rafTimeoutAnimateLeftMenuFingerSwipe);
      }
    },

    touchstartCallback(e) {
      this.touchStartX = e.touches[0].clientX;
      this.directionStartX = this.touchStartX;
    },

    touchmoveCallback(e) {
      const touchPreviousX = this.touchCurrentX;
      this.touchCurrentX = e.touches[0].clientX;

      // If someone is changing direction in the middle of their touch/swipe
      // Record it so we know their new direction intention
      const previousDelta = touchPreviousX && this.directionStartX - touchPreviousX;
      const currentDelta = this.directionStartX - this.touchCurrentX;
      if (Math.abs(previousDelta) > Math.abs(currentDelta)) {
        this.directionStartX = this.touchCurrentX;
      }

      // Start animating the left-menu to follow the user's finger if they swipe over the small deadzone
      if (Math.abs(this.touchStartX - this.touchCurrentX) > SWIPE_THRESHOLD) {
        // Clear up the previous enqueued animation because we are asking for a new state
        // No need to try to update with an old state and overbear the CPU/GPU
        if (this.rafTimeoutAnimateLeftMenuFingerSwipe) {
          raf.cancel(this.rafTimeoutAnimateLeftMenuFingerSwipe);
        }

        this.rafTimeoutAnimateLeftMenuFingerSwipe = raf(this.animateLeftMenuFingerSwipe);
      }
    }
  },

  mounted() {
    this.leftMenuWidth = this.$refs.root.offsetWidth;

    document.addEventListener('touchstart', this.touchstartCallback, { passive: true });
    document.addEventListener('touchmove', this.touchmoveCallback, { passive: true });
    document.addEventListener('touchcancel', this.animateStop);
    document.addEventListener('touchend', this.animateStop);
  },

  beforeDestroy() {
    document.removeEventListener('touchstart', this.touchstartCallback, {
      passive: true
    });
    document.removeEventListener('touchmove', this.touchmoveCallback, { passive: true });
    document.removeEventListener('touchcancel', this.animateStop);
    document.removeEventListener('touchend', this.animateStop);
  }
};

module.exports = fingerSwipeMixin;
