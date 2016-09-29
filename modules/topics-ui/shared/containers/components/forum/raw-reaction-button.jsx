import React, { PropTypes } from 'react';
import ReactDom from 'react-dom';
import classnames from 'classnames';

export default React.createClass({

  displayName: 'RawReactionButton',
  propTypes: {
    className: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      PropTypes.arrayOf(React.PropTypes.node),
      PropTypes.node
    ]),
    reactionList: PropTypes.arrayOf(React.PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string
    })),
    onClick: PropTypes.func,
    onBlur: PropTypes.func,
    onReactionPick: PropTypes.func
  },

  getDefaultProps() {
    return {
      className: 'reaction-button'
    };
  },

  render() {
    const { children, className } = this.props;

    // TODO: Hook up to API
    const likeReactionCount = 2;

    return (
      <button
        className={className}
        onClick={this.onClick}>
        {children || `👍 ${likeReactionCount}`}
      </button>
    );
  },

  onClick(e) {
    this.onReactionClick('like');
    e.preventDefault();
  },

  onReactionClick(reactionKey) {
    const { onReactionPick } = this.props;
    if(onReactionPick) {
      onReactionPick(reactionKey);
    }
  }

});
