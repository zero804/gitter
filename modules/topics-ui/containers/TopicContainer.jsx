"use strict";

import React, {PropTypes, createClass} from 'react';
import TopicHeader from '../shared/components/topic/topic-header.jsx';

module.exports = createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,

    topicsStore: PropTypes.shape({
      models: PropTypes.array.isRequired,
      getById: PropTypes.func.isRequired,
    }).isRequired,
  },

  getInitialState(){
    const { topicsStore, topicId } = this.props;
    return {
      topic: topicsStore.getById(topicId)
    }
  },

  render(){

    const { topic } = this.state;

    return (
      <TopicHeader topic={topic}/>
    );
  }
});
