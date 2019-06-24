'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const SearchBody = require('../../../../../public/js/vue/left-menu/components/search-body.vue');

const {
  createSerializedRoomFixture,
  createSerializedMessageSearchResultFixture
} = require('../../fixture-helpers');

const ROOM_SEARCH_RESULT_FIXTURE = [
  createSerializedRoomFixture('community/room1'),
  createSerializedRoomFixture('community/room2')
];

const MESSAGE_SEARCH_RESULT_FIXTURE = [
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

  it('room search repo loading matches snapshot', () => {
    factory({}, store => {
      store.state.search.repo.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search repo error matches snapshot', () => {
    factory({}, store => {
      store.state.search.repo.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search repo results matches snapshot', () => {
    factory({}, store => {
      store.state.search.repo.results = ROOM_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search room loading matches snapshot', () => {
    factory({}, store => {
      store.state.search.room.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search room error matches snapshot', () => {
    factory({}, store => {
      store.state.search.room.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search room results matches snapshot', () => {
    factory({}, store => {
      store.state.search.room.results = ROOM_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search people loading matches snapshot', () => {
    factory({}, store => {
      store.state.search.people.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search people error matches snapshot', () => {
    factory({}, store => {
      store.state.search.people.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search people results matches snapshot', () => {
    factory({}, store => {
      store.state.search.people.results = ROOM_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('room search combined results matches snapshot', () => {
    factory({}, store => {
      store.state.search.repo.results = [createSerializedRoomFixture('community/repo1')];
      store.state.search.room.results = [createSerializedRoomFixture('community/room1')];
      store.state.search.people.results = [createSerializedRoomFixture('person1')];
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('deduplicates room search combined results matches snapshot', () => {
    factory({}, store => {
      const room1 = createSerializedRoomFixture('community/repo1');
      store.state.search.current.results = [room1];
      store.state.search.repo.results = [room1];
      store.state.search.room.results = [room1];
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('message search loading matches snapshot', () => {
    factory({}, store => {
      store.state.search.message.loading = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('message search error matches snapshot', () => {
    factory({}, store => {
      store.state.search.message.error = true;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('message search results matches snapshot', () => {
    factory({}, store => {
      store.state.search.message.results = MESSAGE_SEARCH_RESULT_FIXTURE;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('calls store action "fetchRoomSearchResults" and "fetchMessageSearchResults" after inputting', () => {
    const searchValue = 'needtofindthisthing';
    factory({ searchImmediately: true }, store => {
      store.state.search.searchInputValue = searchValue;
    });

    wrapper.find({ ref: 'search-input' }).trigger('input');

    expect(stubbedActions.fetchRoomSearchResults).toHaveBeenCalled();
    expect(stubbedActions.fetchMessageSearchResults).toHaveBeenCalled();
  });
});
