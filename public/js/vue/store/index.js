import Vue from 'vue';
import Vuex from 'vuex';
import * as actions from './actions';
import * as getters from './getters';
import mutations from './mutations';
import state from './state';
import threadMessageFeed from '../thread-message-feed/store';

Vue.use(Vuex);

export const modules = { threadMessageFeed };

function createStore(overrides) {
  return new Vuex.Store({
    actions,
    getters,
    mutations,
    state: state(),
    modules,
    ...overrides
  });
}

export default createStore;
