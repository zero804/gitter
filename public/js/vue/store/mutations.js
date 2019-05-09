import Vue from 'vue';
import * as types from './mutation-types';

export default {
  [types.SET_INITIAL_DATA](state, data) {
    Object.assign(state, data);
  },
  [types.SET_TEST](state, testValue) {
    state.test = testValue;
  }
};
