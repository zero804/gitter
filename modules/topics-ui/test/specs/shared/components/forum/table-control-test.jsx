"use strict";

import assert from 'assert';
import React from  'react';
import { shallow, mount } from 'enzyme';
import TableControl from '../../../../../shared/components/forum/table-control.jsx';

describe('<TableControl/>', () => {

  let wrapper;
  let mounted;
  beforeEach(() => {
    wrapper = shallow(<TableControl groupName="gitterHQ" category="all"/>);
    mounted = mount(<TableControl groupName="gitterHQ" category="all"/>);
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

  it.skip('should render two select elements', () => {
    assert.equal(wrapper.find('TableControlSelect').length, 2);
  });

  it('should render with the right default props', () => {
    assert.equal(mounted.props().sortBy.length, 4);
  });

  it('should render only one divider', () => {
    assert.equal(wrapper.find('.tabel-control__divider').length, 1);
  });

});
