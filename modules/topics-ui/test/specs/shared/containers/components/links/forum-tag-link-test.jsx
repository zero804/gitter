import {equal} from 'assert';
import {spy} from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import ForumTagLink from '../../../../../../shared/containers/components/links/forum-tag-link.jsx';
import {subscribe} from '../../../../../../shared/dispatcher';
import {NAVIGATE_TO_TAG} from '../../../../../../shared/constants/forum-tags';
import mockEvt from '../../../../../mocks/event';

describe.only('<ForumTagLink/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <ForumTagLink
        tag={{ value: 'tag', name: 'Tag' }}
        groupName="gitterHQ"
        className="test">
          Link
      </ForumTagLink>
    );
  });

  it('should render an anchor', () => {
    equal(wrapper.find('a').length, 1);
  });

  it('should render the right title', () => {
    equal(wrapper.find('a').at(0).prop('title'), 'View all Tag topics');
  });

  it('should render the right href', () => {
    equal(wrapper.find('a').at(0).prop('href'), '/gitterHQ/topics?tag=tag');
  });

  it('should assign a custom classname if passed', () => {
    equal(wrapper.find('.test').length, 1);
  });

  it('should dispatch the right action when the a is clicked', () => {
    const handle = spy();
    subscribe(NAVIGATE_TO_TAG, handle);
    wrapper.find('a').simulate('click', mockEvt);
    console.log(handle.callCount);
    equal(handle.callCount, 1);
  });

});
