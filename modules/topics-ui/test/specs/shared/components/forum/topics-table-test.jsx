"use strict";

import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicsTable from '../../../../../shared/components/forum/topics-table.jsx';

describe('<TopicsTable/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TopicsTable/>);
  });

  it('should render a container', () => {
      equal(wrapper.find('Container').length, 1);
  });

});
