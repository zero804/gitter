import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicsTableBody from '../../../../../../shared/containers/components/topic/topics-table-body.jsx';

describe('<TopicsTableBody/>', () => {

  let wrapper;
  let topics = [
    { title: '1' },
    { title: '2' },
    { title: '3' },
    { title: '4' },
    { title: '5' },
  ];

  beforeEach(() => {
    wrapper = shallow(<TopicsTableBody topics={topics}/>);
  });

  it('should render a tbody', () => {
    equal(wrapper.find('tbody').length, 1);
  });

  it('should render with a custom class', () => {
    equal(wrapper.find('.topics-table-body').length, 1);
  });

  it('should render a tr from each topic', () => {
    equal(wrapper.find('tr').length, topics.length);
  });

});
