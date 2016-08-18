import React, { createClass, PropTypes } from 'react';
import CreateTopicModal from './components/topic/create-topic-modal.jsx';

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
      <CreateTopicModal active={active}/>
    );
  }
});
