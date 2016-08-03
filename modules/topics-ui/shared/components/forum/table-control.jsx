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
          <nav>
            <ul className="table-control">
              <li>{this.getChildTopicTableButton('Activity', 'activity')}</li>
              <li>{this.getChildTopicTableButton('My Topics', 'my-topics')}</li>
              <li>{this.getChildTopicTableButton('Watched', 'watched')}</li>
            </ul>
          </nav>
        </Panel>
      </Container>
    );
  },

  getChildTopicTableButton(title, value){
    const { groupName, category } = this.props;
    return (
      <TopicTableButton
        title={title}
        value={value}
        groupName={groupName}
        category={category}
        active={false}
        onClick={this.onFilterUpdate}/>
    );
  },

  onFilterUpdate(){
    console.log('Filter Update');
  }

});
