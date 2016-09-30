import { equal, ok } from 'assert';
import { spy } from 'sinon';
import { shallow } from 'enzyme';
import {subscribe} from '../../../../shared/dispatcher';
import React from 'react';

import TopicContainer from '../../../../shared/containers/TopicContainer.jsx';


import { BODY_UPDATE, SUBMIT_NEW_REPLY } from '../../../../shared/constants/create-reply';
import { COMMENT_BODY_UPDATE, SUBMIT_NEW_COMMENT } from '../../../../shared/constants/create-comment';
import {
  SHOW_REPLY_COMMENTS,
  UPDATE_REPLY,
  CANCEL_UPDATE_REPLY,
  SAVE_UPDATE_REPLY,
  UPDATE_COMMENT,
  UPDATE_CANCEL_COMMENT,
  UPDATE_SAVE_COMMENT,
  UPDATE_TOPIC,
  UPDATE_SAVE_TOPIC,
  UPDATE_CANCEL_TOPIC
} from '../../../../shared/constants/topic';


import groupStore from '../../../mocks/group-store';
import forumStore from '../../../mocks/forum-store';
import currentUserStore from '../../../mocks/current-user-store';
import topicsStore from '../../../mocks/topic-store';
import categoryStore from '../../../mocks/category-store';
import repliesStore from '../../../mocks/replies-store';
import tagStore from '../../../mocks/tag-store';
import commentsStore from '../../../mocks/comments-store';
import newReplyStore from '../../../mocks/new-reply-store';
import newCommentStore from '../../../mocks/new-comment-store';




describe('<TopicContainer />', () => {

  let wrapper;

  beforeEach(function(){
    wrapper = shallow(
      <TopicContainer
        groupStore={groupStore}
        forumStore={forumStore}
        currentUserStore={currentUserStore}
        newCommentStore={newCommentStore}
        commentsStore={commentsStore}
        topicsStore={topicsStore}
        tagStore={tagStore}
        categoryStore={categoryStore}
        repliesStore={repliesStore}
        newReplyStore={newReplyStore}
        topicId="1"
        groupUri="gitterHQ"/>
    );
  });

  it('should render a TopicHeader component', () => {
    equal(wrapper.find('TopicHeader').length, 1);
  });

  it('should render a TopicBody', () => {
    equal(wrapper.find('TopicBody').length, 1);
  });

  it('should render a SearchHeaderContainer', () => {
    equal(wrapper.find('SearchHeaderContainer').length, 1);
  });

  it('should render a TopicReplyEditor', () => {
    equal(wrapper.find('TopicReplyEditor').length, 1);
  });

  it('should render a TopicReplyListHeader', () => {
    equal(wrapper.find('TopicReplyListHeader').length, 1);
  });

  it('should render a TopicReplyList', () => {
    equal(wrapper.find('TopicReplyList').length, 1);
  });

  it('should pass the currentUser to the editor', () => {
    ok(
      wrapper.find('TopicReplyEditor').prop('user'),
      'currentUser was not passed to TopicReplyEditor'
    );
  });

  it('should dispatch the right action when the reply body updates', () => {
    const handle = spy();
    subscribe(BODY_UPDATE, handle);
    wrapper.find('TopicReplyEditor').at(0).prop('onChange')('value');
    equal(
      handle.callCount, 1,
      'Failed to dispatch the correct action when the editor updated'
    );
  });

  it('should dispatch the right action when the enter key is pressed on the editor', () => {
    const handle = spy();
    subscribe(SUBMIT_NEW_REPLY, handle);
    // Needs some text to actually submit
    newReplyStore.set({
      text: 'test'
    });
    wrapper.find('TopicReplyEditor').at(0).prop('onSubmit')();
    equal(
      handle.callCount, 1,
      'Failed to dispatch the correct action when the enter key was pressed'
    );
  });

  it('should dispatch the right event when a reply list item is clicked', () => {
    const handle = spy();
    subscribe(SHOW_REPLY_COMMENTS, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onCommentsClicked')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right event when the new topic content updates', () => {
    const handle = spy();
    subscribe(COMMENT_BODY_UPDATE, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onNewCommentUpdate')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right event when the comment is submitted', () => {
    const handle = spy();
    subscribe(SUBMIT_NEW_COMMENT, handle);
    // Needs some text to actually submit
    newCommentStore.set({
      text: 'test'
    });
    wrapper.find('TopicReplyListItem').at(0).prop('submitNewComment')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right event when a reply updates', () => {
    const handle = spy();
    subscribe(UPDATE_REPLY, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onReplyEditUpdate')();
    equal(handle.callCount, 1);
  });

  it('should ispatch the right event when the reply edit is canceled', () => {
    const handle = spy();
    subscribe(CANCEL_UPDATE_REPLY, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onReplyEditCancel')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right action when the reply edit is saved', () => {
    const handle = spy();
    subscribe(SAVE_UPDATE_REPLY, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onReplyEditSaved')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right event when a comment updates', () => {
    const handle = spy();
    subscribe(UPDATE_COMMENT, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onCommentEditUpdate')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right event when the comment edit is canceled', () => {
    const handle = spy();
    subscribe(UPDATE_CANCEL_COMMENT, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onCommentEditCancel')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right action when the comment edit is saved', () => {
    const handle = spy();
    subscribe(UPDATE_SAVE_COMMENT, handle);
    wrapper.find('TopicReplyListItem').at(0).prop('onCommentEditSave')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right event when the topic content updates', () => {
    const handle = spy();
    subscribe(UPDATE_TOPIC, handle);
    wrapper.find('TopicBody').at(0).prop('onTopicEditUpdate')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right action when the topic edit cancels', () => {
    const handle = spy();
    subscribe(UPDATE_CANCEL_TOPIC, handle);
    wrapper.find('TopicBody').at(0).prop('onTopicEditCancel')();
    equal(handle.callCount, 1);
  });

  it('should dispatch the right action when the topic edit cancels', () => {
    const handle = spy();
    subscribe(UPDATE_SAVE_TOPIC, handle);
    wrapper.find('TopicBody').at(0).prop('onTopicEditSave')();
    equal(handle.callCount, 1);
  });

});
