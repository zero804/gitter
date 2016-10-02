import React, { PropTypes } from 'react';
import classnames from 'classnames';

import * as reactionConstants from '../../../constants/reactions';

export default React.createClass({

  displayName: 'RawReactionButton',
  propTypes: {
    className: PropTypes.string,
    ownStateClassName: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      PropTypes.arrayOf(React.PropTypes.node),
      PropTypes.node
    ]),
    reactionCountMap: PropTypes.object,
    ownReactionMap: PropTypes.object,
    onReactionPick: PropTypes.func
  },

  getDefaultProps() {
    return {
      reactionCountMap: {},
      ownReactionMap: {}
    };
  },

  render() {
    const { children, className, ownStateClassName, reactionCountMap, ownReactionMap } = this.props;

    const likeReactionCount = reactionCountMap[reactionConstants.LIKE] || 0;

    const compiledClassName = classnames({
      [className]: true,
      [ownStateClassName]: ownReactionMap[reactionConstants.LIKE]
    })

    return (
      <button
        className={compiledClassName}
        onClick={this.onClick}>
        {children || `👍  ${likeReactionCount}`}
      </button>
    );
  },

  onClick(e) {
    this.onReactionClick(reactionConstants.LIKE);
    e.preventDefault();
  },

  onReactionClick(reactionKey) {
    const { onReactionPick } = this.props;
    if(onReactionPick) {
      onReactionPick(reactionKey);
    }
  }

});
