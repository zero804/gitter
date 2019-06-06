'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const SearchBody = require('../../../../../public/js/vue/left-menu/components/search-body.vue');

const { createSerializedMessageSearchResultFixture } = require('../../fixture-helpers');

const SEARCH_RESULT_FIXTURE = [
  createSerializedMessageSearchResultFixture(),
  createSerializedMessageSearchResultFixture()
];

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

  wrapper = shallowMount(SearchBody.default, {
    localVue,
    store,
    propsData
  });
}

describe('search-body', () => {
  afterEach(() => {
    wrapper.destroy();
  });

  it('matches snapshot', () => {
    factory({});
    expect(wrapper.element).toMatchSnapshot();
  });

  it('loading matches snapshot', () => {
    factory({}, store => {
      store.state.search.messageSearchLoading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('error matches snapshot', () => {
    factory({}, store => {
      store.state.search.messageSearchError = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('search results matches snapshot', () => {
    factory({}, store => {
      store.state.search.messageSearchResults = SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "fetchSearchResults" after inputting', () => {
    const searchValue = 'needtofindthisthing';
    factory({ searchImmediately: true }, store => {
      store.state.search.searchInputValue = searchValue;
    });

    wrapper.find({ ref: 'search-input' }).trigger('input');

    expect(stubbedActions.fetchSearchResults).toHaveBeenCalled();
  });
});
