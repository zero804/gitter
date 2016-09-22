import {equal, ok} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import {spy} from 'sinon';
import SubscribeButton from '../../../../../../shared/containers/components/forum/subscribe-button.jsx';
import { SUBSCRIPTION_STATE } from '../../../../../../shared/constants/forum.js';

const FIXTURE_CLASS_NAME = 'some-button';
const FIXTURE_ITEM_CLASS_NAME = 'some-test-item';


describe('<SubscribeButton/>', () => {

  describe('', () => {
    let wrapper;
    let onClickCb;

    beforeEach(() => {
      onClickCb = spy();
      wrapper = mount(
        <SubscribeButton
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
        <SubscribeButton>
          <span>test</span>
        </SubscribeButton>
      );
    });

    it('uses passed in children instead of text pieces', () => {
      equal(wrapper.children().length, 1);
      equal(wrapper.childAt(0).text(), 'test');
    });
  });


  describe('with `subscriptionState`', () => {
    let wrapper;
    let subscriptionState;

    beforeEach(() => {
      wrapper = mount(
        <SubscribeButton
          subscriptionState={subscriptionState}/>
      );
    });

    var testChildHiddenState = function(childKeytoHiddenMap) {
      wrapper.children().forEach((child) => {
        const key = child.prop('key');
        equal(key, childKeytoHiddenMap[key]);
      });
    };

    it('should show unfollow item when watching forum', () => {
      subscriptionState = SUBSCRIPTION_STATE.SUBSCRIBED;
      testChildHiddenState({
        subscribed: false,
        unsubscribed: true,
        pending: true
      })
    });

    it('should show follow item when not watching forum', () => {
      subscriptionState = SUBSCRIPTION_STATE.UNSUBSCRIBED;
      testChildHiddenState({
        subscribed: true,
        unsubscribed: false,
        pending: true
      })
    });

    it('should show pending item when sending out request', () => {
      subscriptionState = SUBSCRIPTION_STATE.PENDING;
      testChildHiddenState({
        subscribed: true,
        unsubscribed: true,
        pending: false
      })
    });
  });

});
