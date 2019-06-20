'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const SearchBodyMessageResultItem = require('../../../../../public/js/vue/left-menu/components/search-body-message-result-item.vue');

const {
  createSerializedRoomFixture,
  createSerializedMessageSearchResultFixture
} = require('../../fixture-helpers');

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

  wrapper = shallowMount(SearchBodyMessageResultItem.default, {
    localVue,
    store,
    propsData
  });
}

describe('search-body-message-result-item', () => {
  // So the dates look the same wherever you actually are
  require('moment-timezone').tz.setDefault('America/Los_Angeles');

  afterEach(() => {
    wrapper.destroy();
  });

  it('matches snapshot', () => {
    const messageSearchResult = createSerializedMessageSearchResultFixture();
    factory({ messageSearchResult }, store => {
      const room1 = createSerializedRoomFixture('community/room1');
      store.state.roomMap = {
        [room1.id]: room1
      };
      store.state.displayedRoomId = room1.id;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "jumpToMessageId" after clicking result', () => {
    const messageSearchResult = createSerializedMessageSearchResultFixture();
    factory(
      {
        messageSearchResult
      },
      store => {
        const room1 = createSerializedRoomFixture('community/room1');
        store.state.roomMap = {
          [room1.id]: room1
        };
        store.state.displayedRoomId = room1.id;
      }
    );

    wrapper.find({ ref: 'root' }).trigger('click');

    expect(stubbedActions.jumpToMessageId).toHaveBeenCalled();
  });
});
