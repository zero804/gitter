"use strict";

import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicHeader from '../../../../../shared/components/topic/topic-header.jsx';

describe('<TopicHeader/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TopicHeader topic={{ title: 'test' }}/>);
  });

  it('should render a continer element', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a panel', () => {
    equal(wrapper.find('Panel').length, 1);
  });

  it('should render a header', () => {
    equal(wrapper.find('header').length, 1);
  });

  it('should render a H1', () => {
    equal(wrapper.find('H1').length, 1);
  });

  it('should render a custom container', () => {
      equal(wrapper.find('.container--topic-header').length, 1);
  });

});
