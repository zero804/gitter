"use strict";

import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicsTable from '../../../../../shared/components/forum/topics-table.jsx';

describe.only('<TopicsTable/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TopicsTable/>);
  });

  it('should render a container', () => {
      equal(wrapper.find('Container').length, 1);
  });

});
