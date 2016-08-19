import React, { createClass, PropTypes } from 'react';
import CreateTopicModal from './components/topic/create-topic-modal.jsx';
import { dispatch } from '../dispatcher';
import titleUpdate from '../action-creators/create-topic/title-update';
import bodyUpdate from '../action-creators/create-topic/body-update';
import submit from '../action-creators/create-topic/submit';

export default createClass({

  propTypes: {
    active: PropTypes.bool
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
  }

});
