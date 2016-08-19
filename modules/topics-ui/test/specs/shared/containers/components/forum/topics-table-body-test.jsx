import {equal} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import TopicsTableBody from '../../../../../../shared/containers/components/forum/topics-table-body.jsx';

describe('<TopicsTableBody/>', () => {

  let wrapper;
  let topics = [
    { title: '1', id: 1, slug: '1' },
    { title: '2', id: 2, slug: '2' },
    { title: '3', id: 3, slug: '3' },
    { title: '4', id: 4, slug: '4' },
    { title: '5', id: 5, slug: '5' },
  ];

  beforeEach(() => {
    wrapper = mount(<TopicsTableBody topics={topics} groupName="gitterHQ"/>);
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

  it('should add the right url to the topic links', () => {
    var href = wrapper.find('tr').at(0).find('td').at(0).find('a').prop('href');
    equal(href, '/gitterHQ/topics/topic/1/1');
  });

});
