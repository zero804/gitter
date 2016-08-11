"use strict";

import React, {PropTypes, createClass} from 'react';
import TopicHeader from '../shared/components/topic/topic-header.jsx';

module.exports = createClass({

  displayName: 'TopicContainer',
  propTypes: {},

  render(){
    return (
      <TopicHeader />
    );
  }
});
