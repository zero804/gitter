import React, { createClass, PropTypes } from 'react';
import CreateTopicModal from './components/topic/create-topic-modal.jsx';
import { dispatch } from '../dispatcher';
import titleUpdate from '../action-creators/create-topic/title-update';
import bodyUpdate from '../action-creators/create-topic/body-update';
import submit from '../action-creators/create-topic/submit';
import * as consts from '../constants/create-topic';

export default createClass({

  displayName: 'CreateTopicContainer',
  propTypes: {
    active: PropTypes.bool,
    newTopicStore: React.PropTypes.shape({
      get: React.PropTypes.func.isRequired,
      set: React.PropTypes.func.isRequired
    }).isRequired,
  },

  onComponentDidMount(){
    const {newTopicStore} = this.props;
    newTopicStore.on(consts.STORE_CREATE_NEW, this.onStoreCreateNew, this);
  },

  componentWillUnmount(){
    const {newTopicStore} = this.props;
    newTopicStore.off(consts.STORE_CREATE_NEW, this.onStoreCreateNew, this);
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
    console.log('working', newTopicStore);
  }

});
