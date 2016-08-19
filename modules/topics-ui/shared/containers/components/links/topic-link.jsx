import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'TopicLink',
  propTypes: {
    children: PropTypes.node.isRequired,
    groupName: PropTypes.string.isRequired,
    topic: PropTypes.shape({
      id: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    }).isRequired,
  },

  render(){

    const {topic, groupname} = this.props;
    const {slug, id, name} = topic;
    const href = `/gitterHQ/topics/topic/${id}/${slug}`;
    const title = `View ${name}`;

    return (
      <a href={href} title={title}>{this.props.children}</a>
    );
  }

});
