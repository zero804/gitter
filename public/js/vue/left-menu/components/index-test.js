const mount = require('../../__test__/vuex-mount');
const { default: Index } = require('../../../../../public/js/vue/left-menu/components/index.vue');

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
