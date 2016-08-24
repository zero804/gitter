import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import CreateTopicLink from '../../../../../../shared/containers/components/links/forum-category-link.jsx';

describe.only('<CreateTopicLink/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <CreateTopicLink groupName="gitterHQ">
        This is a link
      </CreateTopicLink>
    );
  });

  it('should render an anchor', () => {
    equal(wrapper.find('a').length, 1);
  });

  it('should have the right title', () => {
    equal(wrapper.find('a').at(0).prop('title'), 'Create a new topic');
  });

  it('should render the a with the right href', () => {
    equal(wrapper.find('a').at(0).prop('href'), '/gitterHQ/topics/create-topic');
  });

});
