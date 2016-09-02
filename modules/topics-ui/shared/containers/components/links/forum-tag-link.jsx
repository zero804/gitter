import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import navigateToTag from '../../../action-creators/forum/navigate-to-tag';

export default React.createClass({

  displayName: 'ForumTagLink',
  propTypes: {
    className: PropTypes.string,
    onClick: PropTypes.func,
    groupName: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    tag: PropTypes.shape({
      value: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }).isRequired,
  },

  render(){

    const {tag, groupName, className} = this.props;
    const {name, value} = tag;
    const title = `View all ${name} topics`;
    const href = `/${groupName}/topics?tag=${value}`;

    return (
      <a title={title}
         href={href}
         className={className}
         onClick={this.onClick}>
          {this.props.children}
      </a>
    );
  },

  onClick(e) {
    e.preventDefault();
    const {onClick, tag} = this.props;
    if(onClick) { return onClick(e, tag); }
    dispatch(navigateToTag(tag.value));
  }

});
