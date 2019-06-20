'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const leftMenuConstants = require('../../../../../public/js/vue/left-menu/constants');
const MenuBarItem = require('../../../../../public/js/vue/left-menu/components/menu-bar-item.vue');

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

  wrapper = shallowMount(MenuBarItem.default, {
    localVue,
    store,
    propsData
  });
}

describe('menu-bar-item', () => {
  afterEach(() => {
    wrapper.destroy();
  });

  it('all matches snapshot', () => {
    factory({
      type: 'all'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('when all state, all item has highlight matches snapshot', () => {
    factory(
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_ALL_STATE;
      }
    );
    expect(wrapper.element).toMatchSnapshot();
  });

  it('search matches snapshot', () => {
    factory({
      type: leftMenuConstants.LEFT_MENU_SEARCH_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('people matches snapshot', () => {
    factory({
      type: leftMenuConstants.LEFT_MENU_PEOPLE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('create matches snapshot', () => {
    factory({
      type: leftMenuConstants.LEFT_MENU_CREATE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('toggle matches snapshot', () => {
    factory({
      type: leftMenuConstants.LEFT_MENU_TOGGLE_STATE
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "setLeftMenuState" when item is clicked', () => {
    factory({
      type: leftMenuConstants.LEFT_MENU_ALL_STATE
    });

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.setLeftMenuState).toHaveBeenCalledWith(
      expect.anything(),
      leftMenuConstants.LEFT_MENU_ALL_STATE,
      undefined
    );
  });

  it('calls store action "toggleLeftMenu" with toggled state when active item is clicked', () => {
    const beforeExpandedState = true;
    factory(
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_ALL_STATE;
        store.state.leftMenuExpandedState = beforeExpandedState;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(
      expect.anything(),
      !beforeExpandedState,
      undefined
    );
  });

  it('calls store action "toggleLeftMenu" with expanded state when new item is clicked', () => {
    factory(
      {
        type: leftMenuConstants.LEFT_MENU_ALL_STATE
      },
      store => {
        store.state.leftMenuState = leftMenuConstants.LEFT_MENU_SEARCH_STATE;
        store.state.leftMenuExpandedState = false;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.toggleLeftMenu).toHaveBeenCalledWith(expect.anything(), true, undefined);
  });
});
