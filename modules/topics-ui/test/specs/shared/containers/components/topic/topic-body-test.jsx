import {equal} from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import TopicBody from '../../../../../../shared/containers/components/topic/topic-body.jsx';
import topics from '../../../../../mocks/mock-data/topics';

describe('<TopicBody/>', () => {

  let wrapper;
  const topic = topics[0];

  beforeEach(() => {
    wrapper = mount(<TopicBody topic={topic}/>);
  });

  it('should render a container', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a custom container classname', () => {
    equal(wrapper.find('.container--topic-body').length, 1);
  });

  it('should rendr a panel', () => {
    equal(wrapper.find('Panel').length, 1);
  });

  it('should render a panel with a custom class', () => {
    equal(wrapper.find('.panel--topic-body').length, 1);
  });

  it('should render a .topic-body__content', () => {
    equal(wrapper.find('.topic-body__content').length, 1);
  });

  it('should render a ReactionButton', () => {
     equal(wrapper.find('ReactionButton').length, 1);
  });

});
