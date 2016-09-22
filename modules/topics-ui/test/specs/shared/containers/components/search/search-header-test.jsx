import {equal, deepEqual} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import {spy} from 'sinon';
import proxyquire from 'proxyquire';
import SearchHeader from '../../../../../../shared/containers/components/search/search-header.jsx';
import { FORUM_WATCH_STATE } from '../../../../../../shared/constants/forum.js';

const proxyquireNoCallThru = proxyquire.noCallThru();


describe('<SearchHeader/>', () => {

  let wrapper;

  describe('', () => {
    beforeEach(() => {
      wrapper = shallow(<SearchHeader/>);
    });

    it('should render a container', () => {
      equal(wrapper.find('Container').length, 1);
    });

    it('should render a panel', () => {
      equal(wrapper.find('Panel').length, 1);
    });

    it('should render a ForumCategoryLink', () => {
      equal(wrapper.find('ForumCategoryLink').length, 1);
    });

    it('should render a h1', () => {
      equal(wrapper.find('H1').length, 1);
    });

    it('should render an Input', () => {
      equal(wrapper.find('Input').length, 1);
    });

    it('should render a WatchForumButton', () => {
      equal(wrapper.find('WatchForumButton').length, 1);
    });

    it('should render a CreateTopicLink', () => {
      equal(wrapper.find('CreateTopicLink').length, 1);
    });

    it('should render the create topic link with the right class', () => {
      equal(wrapper.find('.topic-search__create-topic-link').length, 1);
    });

    it('should render a custom class for the input', () => {
      equal(wrapper.find('.topic-search__search-input').length, 1);
    });
  });


  describe('should call action creators with correct arguments', () => {
    const FIXTURE_USER_ID = '123';
    const FIXTURE_FORUM_ID = '456';

    let wrapper;
    let attemptUpdateForumWatchStateSpy;
    beforeEach(() => {
      attemptUpdateForumWatchStateSpy = spy(() => {});
      const mockNoOpDispatcher = { dispatch() {} };

      const SearchHeaderWithMockedThings = proxyquireNoCallThru('../../../../../../shared/containers/components/search/search-header.jsx', {
        '../../../dispatcher':  mockNoOpDispatcher,
        '../../../action-creators/forum/attempt-update-forum-watch-state': attemptUpdateForumWatchStateSpy
      });

      wrapper = shallow(<SearchHeaderWithMockedThings
        forumId={FIXTURE_FORUM_ID}
        userId={FIXTURE_USER_ID}
        watchState={FORUM_WATCH_STATE.NOT_WATCHING}/>
      );
    });

    it('should call `attemptUpdateForumWatchState` with correct arguments', () => {
      equal(attemptUpdateForumWatchStateSpy.callCount, 0);
      wrapper.instance().onWatchForumButtonClick();
      equal(attemptUpdateForumWatchStateSpy.callCount, 1);
      var args = attemptUpdateForumWatchStateSpy.getCall(0).args;
      equal(args.length, 3);
      deepEqual(args, [FIXTURE_FORUM_ID, FIXTURE_USER_ID, true]);
    });
  });

});
