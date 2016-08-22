import {equal} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import TopicsTableBody from '../../../../../../shared/containers/components/forum/topics-table-body.jsx';
import topics from '../../../../../mocks/data/topics';

describe('<TopicsTableBody/>', () => {

  let wrapper;

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

  it('should renderChildRow a topic link for each topic', () => {
    equal(wrapper.find('TopicLink').length, topics.length);
  });

});
