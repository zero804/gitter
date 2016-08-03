"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TopicTableButton from './table-control-button.jsx';

module.exports = React.createClass({

  displayName: 'ForumTableControl',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
  },

  render(){

    const { groupName, category } = this.props;

    return (
      <Container className="container--table-control">
        <Panel className="panel--table-control">
          <TopicTableButton
            title="Activity"
            value="activity"
            groupName={groupName}
            category={category}
            active={false}
            onClick={this.onFilterUpdate}/>
          <TopicTableButton
            title="My Topics"
            value="my-topics"
            groupName={groupName}
            category={category}
            active={false}
            onClick={this.onFilterUpdate}/>
          <TopicTableButton
            title="Watched"
            value="watched"
            groupName={groupName}
            category={category}
            active={false}
            onClick={this.onFilterUpdate}/>
        </Panel>
      </Container>
    );
  },

  onFilterUpdate(){
    console.log('Filter Update');
  }

});
