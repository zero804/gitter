import React, { createClass, PropTypes } from 'react';
import CreateTopicModal from './components/topic/create-topic-modal.jsx';
import { dispatch } from '../dispatcher';
import titleUpdate from '../action-creators/create-topic/title-update';
import bodyUpdate from '../action-creators/create-topic/body-update';
import submit from '../action-creators/create-topic/submit';
import * as consts from '../constants/create-topic';
import submitNewTopic from '../action-creators/create-topic/submit-new-topic';
import navigateToTopic from '../action-creators/topic/navigate-to-topic';

export default createClass({

  displayName: 'CreateTopicContainer',
  propTypes: {
    active: PropTypes.bool,
    groupName: PropTypes.string.isRequired,
    newTopicStore: React.PropTypes.shape({
      get: React.PropTypes.func.isRequired,
      set: React.PropTypes.func.isRequired
    }).isRequired,

    //Topics
    topicsStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getTopics: React.PropTypes.func.isRequired
    }).isRequired,

  },

  componentDidMount(){
    const {newTopicStore, topicsStore} = this.props;
    newTopicStore.on(consts.STORE_CREATE_NEW, this.onStoreCreateNew, this);
    topicsStore.on(consts.TOPIC_CREATED, this.onTopicCreated, this);
  },

  componentWillUnmount(){
    const {newTopicStore, topicsStore} = this.props;
    newTopicStore.off(consts.STORE_CREATE_NEW, this.onStoreCreateNew, this);
    topicsStore.off(consts.TOPIC_CREATED, this.onTopicCreated, this);
  },

  getDefaultProps(){
    return { active: true };
  },

  render(){

    const {active} = this.props;

    return (
      <CreateTopicModal
        active={active}
        onTitleChange={this.onTitleChange}
        onBodyChange={this.onBodyChange}
        onSubmit={this.onSubmit}
        />
    );
  },

  onTitleChange(title){
    dispatch(titleUpdate(title));
  },

  onBodyChange(body){
    dispatch(bodyUpdate(body));
  },

  onSubmit(){
    dispatch(submit());
  },

  onStoreCreateNew(){
    const {newTopicStore} = this.props;
    dispatch(submitNewTopic(
      newTopicStore.get('title'),
      newTopicStore.get('body'))
    );
  },

  onTopicCreated(data){
    console.log(data);
    const {groupName} = this.props;
    dispatch(navigateToTopic(groupName, data.topicId, data.slug));
  }

});
