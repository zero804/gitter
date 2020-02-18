const mount = require('../../__test__/vuex-mount');
const { default: Index } = require('./index.vue');
const appEvents = require('../../../utils/appevents');

import {
  CREATE_COMMUNITY_STEP_MAIN,
  CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB,
  CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITHUB
} from '../constants';

describe('CreateCommunity index', () => {
  it('main step matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.createCommunity.currentStep = CREATE_COMMUNITY_STEP_MAIN;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('backing entity GitLab matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.createCommunity.currentStep = CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITLAB;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('backing entity GitHub matches snapshot', () => {
    const { wrapper } = mount(Index, {}, store => {
      store.state.createCommunity.currentStep = CREATE_COMMUNITY_STEP_BACKING_ENTITY_GITHUB;
    });
    expect(wrapper.element).toMatchSnapshot();
  });

  it('fires off appEvents `destroy-create-community-view` event when close button is clicked', () => {
    const { wrapper } = mount(Index);

    const destroyCreateCommunityViewEventFiredPromise = new Promise(resolve => {
      appEvents.on('destroy-create-community-view', () => {
        resolve();
      });
    });

    wrapper.find({ ref: 'closeButton' }).trigger('click');

    return expect(destroyCreateCommunityViewEventFiredPromise).resolves.toEqual();
  });
});
