'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../public/js/vue/store').default;
const actions = require('../../../../public/js/vue/store/actions');
const LoadingSpinner = require('../../../../public/js/vue/components/loading-spinner.vue');

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

  wrapper = shallowMount(LoadingSpinner.default, {
    localVue,
    store,
    propsData
  });
}

describe('loading-spinner', () => {
  afterEach(() => {
    wrapper.destroy();
  });

  it('matches snapshot', () => {
    factory();
    expect(wrapper.element).toMatchSnapshot();
  });
});
