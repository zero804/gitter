'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const MenuBarItemCreate = require('../../../../../public/js/vue/left-menu/components/menu-bar-item-create.vue');

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

  wrapper = shallowMount(MenuBarItemCreate.default, {
    localVue,
    store,
    propsData
  });
}

describe('menu-bar-item-create', () => {
  afterEach(() => {
    wrapper.destroy();
  });

  it('create matches snapshot', () => {
    factory({
      type: 'create'
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('opens popover when item is clicked', () => {
    factory({
      type: 'create'
    });

    expect(wrapper.vm.popover).toEqual(undefined);

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(wrapper.vm.popover).toBeDefined();
  });
});
