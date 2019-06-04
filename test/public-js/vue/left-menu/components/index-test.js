'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const Index = require('../../../../../public/js/vue/left-menu/components/index.vue');

let wrapper;
let stubbedActions = {};
function factory(propsData = {}, extendStore = () => {}) {
  const localVue = createLocalVue();
  localVue.use(Vuex);

  Object.keys(actions).forEach(actionKey => {
    stubbedActions[actionKey] = jest.fn();
  });

  const store = createStore({
    actions: stubbedActions
  });
  extendStore(store);

  wrapper = shallowMount(Index.default, {
    localVue,
    store,
    propsData
  });
}

describe('left-menu index', () => {
  afterEach(() => {
    wrapper.destroy();
  });

  describe('all state', () => {
    it('matches snapshot', () => {
      factory({}, store => {
        store.state.leftMenuState = 'all';
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('matches snapshot with some rooms', () => {
      factory({}, store => {
        store.state.leftMenuState = 'all';

        store.state.roomMap = {
          1: { id: 1, lastAccessTime: 1 },
          2: { id: 2, lastAccessTime: 1 },
          3: { id: 3, lastAccessTime: 1 }
        };
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('people state', () => {
    it('matches snapshot', () => {
      factory({}, store => {
        store.state.leftMenuState = 'people';
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('search state', () => {
    it('matches snapshot', () => {
      factory({}, store => {
        store.state.leftMenuState = 'search';
      });
      expect(wrapper.element).toMatchSnapshot();
    });
  });

  describe('pinning and expanding', () => {
    it('not pinned and collapse', () => {
      factory({}, store => {
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = false;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('not pinned and expanded', () => {
      factory({}, store => {
        store.state.leftMenuPinnedState = false;
        store.state.leftMenuExpandedState = true;
      });
      expect(wrapper.element).toMatchSnapshot();
    });

    it('calls store action "toggleLeftMenu" after mouse leaves', () => {
      factory({}, store => {
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
});
