import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyEditor from '../../../../../../shared/containers/components/topic/topic-reply-editor.jsx';

describe('<TopicReplyEditor/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TopicReplyEditor/>);
  });

  it('should render a container', () => {
    equal(wrapper.find('Container').length, 1);
  });

  it('should render a panel', () => {
    equal(wrapper.find('Panel').length, 1);
  });

  it('should render an editor', () => {
    equal(wrapper.find('Editor').length, 1);
  });

  it('should render the container with a custom class', () => {
    equal(wrapper.find('.container--reply-editor').length, 1);
  });

  it('should render the panel with a custom class', () => {
    equal(wrapper.find('.panel--reply-editor').length, 1);
  });

  it('should render a cutom editor class', () => {
    equal(wrapper.find('.editor--reply').length, 1);
  });

});
