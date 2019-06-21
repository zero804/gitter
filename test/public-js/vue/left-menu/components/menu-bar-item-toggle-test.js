'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const leftMenuConstants = require('../../../../../public/js/vue/left-menu/constants');
const MenuBarItemToggle = require('../../../../../public/js/vue/left-menu/components/menu-bar-item-toggle.vue');

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

  wrapper = shallowMount(MenuBarItemToggle.default, {
    localVue,
    store,
    propsData
  });
}

describe('menu-bar-item-toggle', () => {
  afterEach(() => {
    wrapper.destroy();
  });

  it('toggle matches snapshot', () => {
    factory({
      type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "toggleLeftMenuPinnedState" when item is clicked', () => {
    const beforePinnedState = false;
    factory(
      {
        type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
      },
      store => {
        store.state.leftMenuPinnedState = beforePinnedState;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenuPinnedState).toHaveBeenCalledWith(
      expect.anything(),
      !beforePinnedState,
      undefined
    );
  });
});
