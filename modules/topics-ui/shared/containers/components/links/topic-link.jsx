import React, { PropTypes, createClass } from 'react';
import {dispatch} from '../../../dispatcher';
import navigateToTopic from '../../../action-creators/topic/navigate-to-topic';

export default createClass({

  displayName: 'TopicLink',
  propTypes: {
    children: PropTypes.node.isRequired,
    groupName: PropTypes.string.isRequired,
    topic: PropTypes.shape({
      id: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired
    }).isRequired,
  },

  render(){

    const {topic, groupName} = this.props;
    const {slug, id, title} = topic;
    const href = `/${groupName}/topics/topic/${id}/${slug}`;
    const elementTitle = `View ${title}`;

    return (
      <a href={href} title={elementTitle} onClick={this.onClick}>{this.props.children}</a>
    );
  },

  onClick(e){
    e.preventDefault();
    const {topic, groupName} = this.props;
    const {id, slug} = topic;
    dispatch(navigateToTopic(groupName, id, slug));
  }

});
