import {equal} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import TopicsTableHeader from '../../../../../../shared/containers/components/forum/topics-table-header.jsx';

describe('<TopicsTableHeader/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = mount(<TopicsTableHeader/>);
  });

  it('render a thead', () => {
    equal(wrapper.find('thead').length, 1);
  });

  it('should render 4 th elements', () => {
    equal(wrapper.find('th').length, 4);
  });

  it('should render with the right class', () => {
    equal(wrapper.find('.topics-table-header').length, 1);
  });

  it('should render the th elements with the right class', () => {
    equal(wrapper.find('.topics-table-header__cell').length, 4);
  });

});
