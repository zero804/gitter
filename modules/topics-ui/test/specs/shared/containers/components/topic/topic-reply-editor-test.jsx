import {equal, ok} from 'assert';
import {spy} from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import TopicReplyEditor from '../../../../../../shared/containers/components/topic/topic-reply-editor.jsx';
import currentUser from '../../../../../mocks/mock-data/current-user';

describe('<TopicReplyEditor/>', () => {

  let wrapper;
  let changeHandle;
  let enterHandle;

  beforeEach(() => {
    changeHandle = spy();
    enterHandle = spy();
    wrapper = shallow(
      <TopicReplyEditor
        user={currentUser}
        onChange={changeHandle}
        onEnter={enterHandle}/>
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

  it('should pass an onChange call back to the editor', () => {
    ok(
      wrapper.find('Editor').prop('onChange'),
      'TopicReplyEditor failed to provide onChange callback to the editor'
    );
  });

  it('should call onChange when the editor changes', () => {
    wrapper.find('Editor').prop('onChange')();
    equal(changeHandle.callCount, 1, 'ReplyEditor failed to call onChange');
  });

  it('should call onEnter when the editor calls onEnter', () => {
    wrapper.find('Editor').prop('onEnter')();
    equal(enterHandle.callCount, 1, 'ReplyEditor failed to call onEnter');
  });

});
