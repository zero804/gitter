import React, { PropTypes } from 'react';
import RawReactionButton from './raw-reaction-button.jsx';

export default React.createClass({

  displayName: 'ReactionButton',
  propTypes: {
    className: PropTypes.string,
    children:  PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node
    ]),
    reactionCountMap: PropTypes.object,
    ownReactionMap: PropTypes.object,
    onReactionPick: PropTypes.func
  },

  getDefaultProps() {
    return {
      className: 'reaction-button',
      reactionCountMap: {},
      ownReactionMap: {}
    };
  },

  render() {
    const { children, className, reactionCountMap, ownReactionMap } = this.props;

    return (
      <RawReactionButton
        className={className}
        ownStateClassName="has-reaction"
        children={children}
        onBlur={this.onBlur}
        reactionCountMap={reactionCountMap}
        ownReactionMap={ownReactionMap}
        onReactionPick={this.onReactionPick} />
    );
  },

  onReactionPick(reactionKey) {
    const { ownReactionMap, onReactionPick } = this.props;
    const currentOwnReactionState = ownReactionMap[reactionKey];

    if(onReactionPick) {
      onReactionPick(reactionKey, !currentOwnReactionState);
    }
  }

});
