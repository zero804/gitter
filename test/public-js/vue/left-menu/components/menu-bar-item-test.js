'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
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
        type: 'all'
      },
      store => {
        store.state.leftMenuState = 'all';
      }
    );
    expect(wrapper.element).toMatchSnapshot();
  });

  it('search matches snapshot', () => {
    factory({
      type: 'search'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('people matches snapshot', () => {
    factory({
      type: 'people'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('create matches snapshot', () => {
    factory({
      type: 'create'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('toggle matches snapshot', () => {
    factory({
      type: 'toggle'
    });
    expect(wrapper.element).toMatchSnapshot();
  });
});
