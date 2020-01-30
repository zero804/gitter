const mount = require('../../__test__/vuex-mount');
const { default: Index } = require('./index.vue');

function createTouchEvent(eventName, x, y) {
  const e = new CustomEvent(eventName);
  e.touches = [
    {
      clientX: x,
      clientY: y
    }
  ];

  return e;
}

describe('left-menu index', () => {
  describe('all state', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.leftMenuState = 'all';
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('people state', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.leftMenuState = 'people';
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('search state', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.leftMenuState = 'search';
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('pinning and expanding', () => {
    it('not pinned and collapse', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = false;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('not pinned and expanded', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('calls store action "toggleLeftMenu" after mouse leaves', () => {
      const { wrapper, stubbedActions } = mount(Index, {}, store => {
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = true;
      });
      wrapper.find({ ref: 'root' }).trigger('mouseleave');

      expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(
        expect.anything(),
        false,
        undefined
      );
    });
  });

  describe('mobile', () => {
    it('mobile matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.isMobile = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('swipe right expands left-menu', () => {
      const { stubbedActions } = mount(Index, {}, store => {
        store.state.isMobile = true;
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = false;
      });

      // Start the swipe on the left-side of the screen
      document.dispatchEvent(createTouchEvent('touchstart', 100));

      // Then move your finger in the right direction
      document.dispatchEvent(createTouchEvent('touchmove', 200));

      document.dispatchEvent(createTouchEvent('touchend'));

      expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(
        expect.anything(),
        true,
        undefined
      );
    });

    it('swipe left collapes left-menu', () => {
      const { stubbedActions } = mount(Index, {}, store => {
        store.state.isMobile = true;
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = true;
      });

      // Start the swipe on the right-side of the screen
      document.dispatchEvent(createTouchEvent('touchstart', 200));

      // Then move your finger in the left direction
      document.dispatchEvent(createTouchEvent('touchmove', 100));

      document.dispatchEvent(createTouchEvent('touchend'));

      expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(
        expect.anything(),
        false,
        undefined
      );
    });

    it('swipe left -> right keeps left-menu expanded', () => {
      const { stubbedActions } = mount(Index, {}, store => {
        store.state.isMobile = true;
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = true;
      });

      // Start the swipe on the right-side of the screen
      document.dispatchEvent(createTouchEvent('touchstart', 200));

      // Then move your finger in the left direction
      document.dispatchEvent(createTouchEvent('touchmove', 100));

      // Then move your finger back to the right
      document.dispatchEvent(createTouchEvent('touchmove', 150));

      document.dispatchEvent(createTouchEvent('touchend'));

      expect(stubbedActions.toggleLeftMenu).not.toHaveBeenCalled();
    });
  });

  describe('nli (not logged in)', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.isLoggedIn = false;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('mobile matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.isMobile = true;
        store.state.isLoggedIn = false;
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('dark-theme', () => {
    it('matches snapshot', () => {
      const { wrapper } = mount(Index, {}, store => {
        store.state.darkTheme = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });
});
