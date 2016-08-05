"use strict";

import assert from 'assert';
import React from  'react';
import Backbone from 'backbone';
import sinon from 'sinon';
import { shallow, mount } from 'enzyme';
import TableControl from '../../../../../shared/components/forum/table-control.jsx';


var TagCollection = Backbone.Collection.extend({
  getTags(){ return this.models.map((m) => m.toJSON() ); }
});

describe.only('<TableControl/>', () => {

  let wrapper;
  let mounted;
  let tags;
  let filterHandle;
  let tagHandle;
  let sortHandle;

  beforeEach(() => {
    filterHandle = sinon.spy();
    tagHandle = sinon.spy();
    sortHandle = sinon.spy();
    tags = [{value: 'all-tags', name: 'All Tags', active: true }];
    wrapper = shallow(
      <TableControl
      tags={tags}
      groupName="gitterHQ"
      category="all"
      filterChange={filterHandle}
      tagChange={tagHandle}
      sortChange={sortHandle}/>
    );
    mounted = mount(
      <TableControl
      tags={tags}
      groupName="gitterHQ"
      category="all"
      filterChange={filterHandle}
      tagChange={tagHandle}
      sortChange={sortHandle}/>
    );
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

  it('should render two select elements', () => {
    assert.equal(wrapper.find('TableControlSelect').length, 2);
  });

  it('should render with the right default props', () => {
    assert.equal(mounted.props().sortBy.length, 4);
  });

  it('should render only one divider', () => {
    assert.equal(wrapper.find('.tabel-control__divider').length, 1);
  });

  it('should call filterChange when a TopicTableButton is pressed', () => {
    wrapper.find('TableControlButton').at(0).prop('onClick')();
    assert.equal(filterHandle.callCount, 1);
  });

  it('should call filterChange with the right arguments', () => {
    wrapper.find('TableControlButton').at(0).prop('onClick')('activity');
    assert(filterHandle.calledWith('activity'));
  });

  it('should call tagChange when the first TopicTableSelect changes', () => {
    wrapper.find('TableControlSelect').at(0).prop('onChange')();
    assert.equal(tagHandle.callCount, 1);
  });

  it('should call tagChange with the right arguments', () => {
    wrapper.find('TableControlSelect').at(0).prop('onChange')('tag');
    assert(tagHandle.calledWith('tag'));
  });

  it('should call sortChange when the second TopicTableSelect changes', () => {
    wrapper.find('TableControlSelect').at(1).prop('onChange')();
    assert.equal(sortHandle.callCount, 1);
  });

  it('should call sortChange with the right arguments', () => {
    wrapper.find('TableControlSelect').at(1).prop('onChange')('sort');
    assert(sortHandle.calledWith('sort'));
  });

});
