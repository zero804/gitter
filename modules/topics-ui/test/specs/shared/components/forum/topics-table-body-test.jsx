"use strict";

import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicsTableBody from '../../../../../shared/components/forum/topics-table-body.jsx';

describe('<TopicsTableBody/>', () => {

  let wrapper;
  let topics = [
    { title: { text: '1', html: '1' } },
    { title: { text: '2', html: '2' } },
    { title: { text: '3', html: '3' } },
    { title: { text: '4', html: '4' } },
    { title: { text: '5', html: '5' } },
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
