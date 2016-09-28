import React, { PropTypes, createClass } from 'react';
import {dispatch} from '../../../dispatcher';
import navigateToTopic from '../../../action-creators/topic/navigate-to-topic';

export default createClass({

  displayName: 'TopicLink',
  propTypes: {
    children: PropTypes.node.isRequired,
    groupUri: PropTypes.string.isRequired,
    topic: PropTypes.shape({
      id: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired
    }).isRequired,
    className: PropTypes.string,
  },

  render(){

    const {topic, groupUri, className} = this.props;
    const {slug, id, title} = topic;
    const href = `/${groupUri}/topics/topic/${id}/${slug}`;
    const elementTitle = `View ${title}`;

    return (
      <a
        href={href}
        title={elementTitle}
        className={className}
        onClick={this.onClick}>
        {this.props.children}
      </a>
    );
  },

  onClick(e){
    e.preventDefault();
    const {topic, groupUri} = this.props;
    const {id, slug} = topic;
    dispatch(navigateToTopic(groupUri, id, slug));
  }

});
