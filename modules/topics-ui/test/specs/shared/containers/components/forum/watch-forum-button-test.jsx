import {equal, ok} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import {spy} from 'sinon';
import WatchForumButton from '../../../../../../shared/containers/components/forum/watch-forum-button.jsx';
import { FORUM_WATCH_STATE } from '../../../../../../shared/constants/forum.js';

const FIXTURE_CLASS_NAME = 'some-button';
const FIXTURE_ITEM_CLASS_NAME = 'some-test-item';


describe('<WatchForumButton/>', () => {

  describe('', () => {
    let wrapper;
    let onClickCb;

    beforeEach(() => {
      onClickCb = spy();
      wrapper = mount(
        <WatchForumButton
          className={FIXTURE_CLASS_NAME}
          itemClassName={FIXTURE_ITEM_CLASS_NAME}
          onClick={onClickCb} />
      );
    });

    it('calls `onClick` callback argument', () => {
      wrapper.simulate('click');
      equal(onClickCb.callCount, 1);
    });

    it('should have passed in class name', () => {
      // We can't look directly on the wrapper because of some `hasClass` weirdness
      // see https://github.com/airbnb/enzyme/issues/307
      ok(wrapper.find(`.${FIXTURE_CLASS_NAME}`).hasClass(FIXTURE_CLASS_NAME));
    });

    it('should have passed in item class name on items', () => {
      wrapper.children().forEach((child) => {
        ok(child.hasClass(FIXTURE_ITEM_CLASS_NAME));
      });
    });

    it('should include follow, unfollow, pending text pieces', () => {
      equal(wrapper.children().length, 3);
    });
  });


  describe('', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(
        <WatchForumButton>
          <span>test</span>
        </WatchForumButton>
      );
    });

    it('uses passed in children instead of text pieces', () => {
      equal(wrapper.children().length, 1);
      equal(wrapper.childAt(0).text(), 'test');
    });
  });


  describe('with `watchState`', () => {
    let wrapper;
    let watchState;

    beforeEach(() => {
      wrapper = mount(
        <WatchForumButton
          watchState={watchState}/>
      );
    });

    var testChildHiddenState = function(childKeytoHiddenMap) {
      wrapper.children().forEach((child) => {
        const key = child.prop('key');
        equal(key, childKeytoHiddenMap[key]);
      });
    };

    it('should show unfollow item when watching forum', () => {
      watchState = FORUM_WATCH_STATE.WATCHING;
      testChildHiddenState({
        unfollow: false,
        follow: true,
        pending: true
      })
    });

    it('should show follow item when not watching forum', () => {
      watchState = FORUM_WATCH_STATE.NOT_WATCHING;
      testChildHiddenState({
        unfollow: true,
        follow: false,
        pending: true
      })
    });

    it('should show pending item when sending out request', () => {
      watchState = FORUM_WATCH_STATE.PENDING;
      testChildHiddenState({
        unfollow: true,
        follow: true,
        pending: false
      })
    });
  });

});
