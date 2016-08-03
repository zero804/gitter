"use strict";

import assert from 'assert';
import React from  'react';
import Backbone from 'backbone';
import { shallow, mount } from 'enzyme';
import TableControl from '../../../../../shared/components/forum/table-control.jsx';


var TagCollection = Backbone.Collection.extend({
  getTags(){ return this.models.map((m) => m.toJSON() ); }
});

describe('<TableControl/>', () => {

  let wrapper;
  let mounted;
  let tagCollection;
  beforeEach(() => {
    tagCollection = new TagCollection([{value: 'all-tags', name: 'All Tags', active: true }])
    wrapper = shallow(<TableControl tagStore={tagCollection} groupName="gitterHQ" category="all"/>);
    mounted = mount(<TableControl tagStore={tagCollection} groupName="gitterHQ" category="all"/>);
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
