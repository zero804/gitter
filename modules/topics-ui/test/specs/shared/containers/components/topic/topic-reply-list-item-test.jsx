<<<<<<< HEAD
import { equal } from 'assert';
import React from 'react';
import { mount } from 'enzyme';
=======
import React from 'react';
import {equal} from 'assert';
import { shallow } from 'enzyme';
import {spy} from 'sinon';

>>>>>>> develop
import TopicReplyListItem from '../../../../../../shared/containers/components/topic/topic-reply-list-item.jsx';

import replies from '../../../../../mocks/mock-data/replies.js';
import currentUser from '../../../../../mocks/mock-data/current-user';

describe('<TopicReplyListItem/>', () => {

  let wrapper;
  let reply = replies[0];
  reply.formattedSentDate = 'SEPT 14th';
  const newCommentContent = '';

<<<<<<< HEAD
  beforeEach(() => {
    wrapper = mount(
      <TopicReplyListItem reply={reply}/>
    );
  });

  it('should render a FeedItem', () => {
    equal(wrapper.find('FeedItem').length, 1);
  });

  it('should render FeedItem with these footer actions');

  it('should render a ReactionButton', () => {
     equal(wrapper.find('ReactionButton').length, 1);
=======
  let commentsClickedHandle;
  let commentUpdateHandle;
  let submitNewCommentHandle;
  let submitCommentHandle;

  let onReplyEdit;
  let onReplyCancel;
  let onReplySave;

  let onCommentEdit;
  let onCommentCancel;
  let onCommentSave;


  beforeEach(() => {

    submitNewCommentHandle = spy();
    commentsClickedHandle = spy();
    commentUpdateHandle = spy();
    commentsClickedHandle = spy();
    commentUpdateHandle = spy();
    submitCommentHandle = spy();
    onReplyEdit = spy();
    onReplyCancel = spy();
    onReplySave = spy();
    onCommentEdit = spy();
    onCommentCancel = spy();
    onCommentSave = spy();


    wrapper = shallow(
      <TopicReplyListItem
        reply={reply}
        submitNewComment={submitNewCommentHandle}
        onCommentsClicked={commentsClickedHandle}
        onNewCommentUpdate={commentUpdateHandle}
        onReplyEditUpdate={onReplyEdit}
        onReplyEditCancel={onReplyCancel}
        onReplyEditSaved={onReplySave}
        onCommentEditUpdate={onCommentEdit}
        onCommentEditCancel={onCommentCancel}
        onCommentEditSave={onCommentSave}
        currentUser={currentUser}/>
    );
>>>>>>> develop
  });



});
