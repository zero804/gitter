"use strict";

import assert from 'assert';
import React from  'react';
import { shallow } from 'enzyme';
import TableControl from '../../../../../shared/components/forum/table-control.jsx';

describe('<TableControl/>', () => {

  let wrapper;
  beforeEach(() => {
    wrapper = shallow(<TableControl groupName="gitterHQ" category="all"/>);
  });

  it('should render a container', () => {
    assert.equal(wrapper.find('Container').length, 1);
  });

  it('should render a panel', () => {
    assert.equal(wrapper.find('Panel').length, 1);
  });

  it('should render the panel with a variation class', () => {
    assert.equal(wrapper.find('.panel--table-control').length, 1);
  });

  it('should render the container with a custom class', () => {
    assert.equal(wrapper.find('.container--table-control').length, 1);
  });

  it('should render three table-control-buttons', () => {
    assert.equal(wrapper.find('TableControlButton').length, 3);
  });

});
