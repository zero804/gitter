import {equal} from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyEditor from '../../../../../../shared/containers/components/topic/topic-reply-editor.jsx';
import currentUser from '../../../../../mocks/mock-data/current-user';

describe.only('<TopicReplyEditor/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(
      <TopicReplyEditor user={currentUser}/>
    );
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

  it('should render a UserAvatar', () => {
    equal(wrapper.find('UserAvatar').length, 1);
  });

  it('should render the user avatar with the right class', () => {
    equal(wrapper.find('UserAvatar').prop('className'), 'avatar--reply-editor');
  });

  it('should render the UserAvatar with the right dimensions', () => {
    equal(wrapper.find('UserAvatar').prop('width'), 30);
    equal(wrapper.find('UserAvatar').prop('height'), 30);
  });

});
