'use strict';

const { createLocalVue, shallowMount } = require('@vue/test-utils');
const Vuex = require('vuex');

const createStore = require('../../../../../public/js/vue/store').default;
const actions = require('../../../../../public/js/vue/store/actions');
const SearchBody = require('../../../../../public/js/vue/left-menu/components/search-body.vue');

const SEARCH_RESULT_FIXTURE = [
  {
    id: '573bd813e2996a5a42c95899',
    text:
      "@MadLittleMods For some groups it might not matter much, but for others a lot.  Kinda like stack overflows 'take this offline' thing when you start doing a conversation in the comments.  Im' sure it's not simple to design",
    html:
      '<span data-link-type="mention" data-screen-name="MadLittleMods" class="mention">@MadLittleMods</span> For some groups it might not matter much, but for others a lot.  Kinda like stack overflows &#39;take this offline&#39; thing when you start doing a conversation in the comments.  Im&#39; sure it&#39;s not simple to design',
    sent: '2016-05-18T02:48:51.386Z',
    fromUser: {
      id: '5716e949187bb6f0eae04dd7',
      username: 'awbacker',
      displayName: 'Andrew Backer',
      url: '/awbacker',
      avatarUrl: 'https://avatars-03.gitter.im/gh/uv/4/awbacker',
      avatarUrlSmall: 'https://avatars0.githubusercontent.com/u/103330?v=4&s=60',
      avatarUrlMedium: 'https://avatars0.githubusercontent.com/u/103330?v=4&s=128',
      v: 2,
      gv: '4'
    },
    unread: false,
    readBy: 40,
    urls: [],
    mentions: [
      {
        screenName: 'MadLittleMods',
        userId: '553d437215522ed4b3df8c50',
        userIds: []
      }
    ],
    issues: [],
    meta: [],
    highlights: ['offline'],
    v: 1
  },
  {
    id: '5696c53605627b590966f781',
    text:
      'but I were offline for a day and there we new message, I would get an email notification / digest for them, right?',
    html:
      'but I were offline for a day and there we new message, I would get an email notification / digest for them, right?',
    sent: '2016-01-13T21:44:22.136Z',
    fromUser: {
      id: '5497f776db8155e6700e1ebe',
      username: 'borekb',
      displayName: 'Borek Bernard',
      url: '/borekb',
      avatarUrl: 'https://avatars-05.gitter.im/gh/uv/4/borekb',
      avatarUrlSmall: 'https://avatars0.githubusercontent.com/u/101152?v=4&s=60',
      avatarUrlMedium: 'https://avatars0.githubusercontent.com/u/101152?v=4&s=128',
      v: 18,
      gv: '4'
    },
    unread: false,
    readBy: 38,
    urls: [],
    mentions: [],
    issues: [],
    meta: [],
    highlights: ['offline'],
    v: 1
  }
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
  // So the dates look the same wherever you actually are
  require('moment-timezone').tz.setDefault('America/Los_Angeles');

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
