import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicLink from '../../../../../../shared/containers/components/links/topic-link.jsx';

describe.only('<TopicLink/>', () => {

  let wrapper;
  const topic = {
    name: 'This is a test',
    slug: 'this-is-a-test',
    id: '12345'
  }

  beforeEach(() => {
    wrapper = shallow(<TopicLink groupName='gitterHQ' topic={topic}/>);
  });

  it('should render an anchor', () => {
    equal(wrapper.find('a').length, 1);
  });

  it('should render the right href', () => {
    equal(wrapper.find('a').at(0).prop('href'), '/gitterHQ/topics/topic/12345/this-is-a-test');
  });

  it('should render the right title', () => {
    equal(wrapper.find('a').at(0).prop('title'), 'View This is a test');
  });

});
