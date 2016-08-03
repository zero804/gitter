"use strict";

import assert from 'assert';
import React from  'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import TopicTableButton from '../../../../../shared/components/forum/table-control-button.jsx';

describe('<TopicTableButton/>', () => {

  let wrapper;
  let wrapperActive;
  let title;
  let value;
  let clickHandle;
  beforeEach(() => {
    title = 'Activity';
    value = 'activity';
    clickHandle = sinon.spy();
    wrapper = shallow(
      <TopicTableButton
        title={title}
        value={value}
        onClick={clickHandle}
        active={false}
        groupName="gitterHQ" />
    );
    wrapperActive = shallow(
      <TopicTableButton
        title={title}
        value={value}
        onClick={clickHandle}
        active={true}
        groupName="gitterHQ"
        category="test"/>
    );
  });

  it('should render an anchor', () => {
    assert.equal(wrapper.find('a').length, 1);
  });

  it('should derive the right title attribute', () => {
    assert.equal(wrapper.find('a').prop('title'), `Filter current topics by ${title}`);
  });

  it('should call the onClick handle with the right data on click', () => {
    wrapper.find('a').simulate('click');
    assert.equal(clickHandle.callCount, 1);
    assert(clickHandle.calledWith(title));
  });

  it('should render an element with the right class', () => {
    assert.equal(wrapper.find('.topic-control__button').length, 1);
  });

  it('should render an active class when in the active state', () => {
    assert.equal(wrapperActive.find('.topic-control__button--active').length, 1);
  });

  //
  it('should construct the correct href', () => {
    assert.equal(wrapper.find('a').prop('href'), `/gitterHQ/topics?filter=${value}`);
    assert.equal(wrapperActive.find('a').prop('href'), `/gitterHQ/topics/categories/test?filter=${value}`);
  });

});
