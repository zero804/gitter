import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicsTable from '../../../../../../shared/containers/components/forum/topics-table.jsx';

describe('<TopicsTable/>', () => {

  let wrapper;
  let topics = [];

  beforeEach(() => {
    wrapper = shallow(<TopicsTable topics={topics} groupname="gitterHQ"/>);
  });

  it('should render a container', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a table', () => {
    equal(wrapper.find('table').length, 1);
  });

  it('should render a TopicsTableHeader', () => {
    equal(wrapper.find('TopicsTableHeader').length, 1);
  });

  it('should render the table with the right class', () => {
    equal(wrapper.find('.topics-table').length, 1);
  });

  it('should render a TopicsTableBody', () => {
    equal(wrapper.find('TopicsTableBody').length, 1);
  });

});
