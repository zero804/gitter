'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../public/js/vue/store').default;
const actions = require('../../../public/js/vue/store/actions');

const mount = (Component, propsData = {}, extendStore = () => {}) => {
  const localVue = createLocalVue();
  localVue.use(Vuex);

  const stubbedActions = {};
  Object.keys(actions).forEach(actionKey => {
    stubbedActions[actionKey] = jest.fn().mockImplementation(actions[actionKey]);
  });

  const store = createStore({
    actions: stubbedActions
  });
  extendStore(store);

  const wrapper = shallowMount(Component, {
    localVue,
    store,
    propsData
  });

  return { wrapper, stubbedActions, store };
};

module.exports = mount;
