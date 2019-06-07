'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
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
      type: 'toggle'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "toggleLeftMenuPinnedState" when item is clicked', () => {
    const beforePinnedState = true;
    factory(
      {
        type: 'toggle'
      },
      state => {
        state.leftMenuPinnedState = beforePinnedState;
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
