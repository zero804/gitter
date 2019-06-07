<script>
import _ from 'underscore';
import moment from 'moment';
import { mapState, mapActions } from 'vuex';

import LoadingSpinner from '../../components/loading-spinner.vue';

const SEARCH_DEBOUNCE_INTERVAL = 1000;

export default {
  name: 'SearchBody',
  components: {
    LoadingSpinner
  },
  props: {
    // We use this in tests so we don't have to wait for the search to happen
    searchImmediately: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState({
      searchInputValue: state => state.search.searchInputValue,
      messageSearchLoading: state => state.search.messageSearchLoading,
      messageSearchError: state => state.search.messageSearchError,
      messageSearchResults: state => state.search.messageSearchResults
    }),
    searchInputModel: {
      get() {
        return this.searchInputValue;
      },
      set(value) {
        this.updateSearchInputValue(value);
        this.debouncedFetchSearchResults();
      }
    },
    hasMessageSearchResults() {
      return this.messageSearchResults && this.messageSearchResults.length > 0;
    }
  },

  methods: {
    ...mapActions(['updateSearchInputValue', 'fetchSearchResults']),

    _debouncedFetchSearchResults: _.debounce(function() {
      this.fetchSearchResults();
    }, SEARCH_DEBOUNCE_INTERVAL),

    debouncedFetchSearchResults() {
      if (this.searchImmediately) {
        this.fetchSearchResults();
      } else {
        this._debouncedFetchSearchResults();
      }
    },

    getMessageDisplayDate(sentTimestamp) {
      return moment(sentTimestamp).format('MMM Do LT');
    }
  }
};
</script>

<template>
  <div class="search-body-root">
    <h2 class="search-body-title">Search</h2>

    <div class="search-input-wrapper">
      <input ref="search-input" v-model="searchInputModel" class="search-input" />
    </div>

    <h2 class="search-body-title">
      Chat messages
      <loading-spinner v-if="messageSearchLoading" />
    </h2>

    <div v-if="messageSearchError">
      Error fetching messages
    </div>
    <ul v-else-if="hasMessageSearchResults" class="message-search-list">
      <li
        v-for="messageSearchResult in messageSearchResults"
        :key="messageSearchResult.id"
        class="message-search-item"
      >
        <span class="message-search-item-detail">
          <a class="message-search-item-detail-author-link" href="#0"
            >{{ messageSearchResult.fromUser.displayName }}
            <span>@{{ messageSearchResult.fromUser.username }}</span>
          </a>
          <span>&#9679;</span>
          <a class="message-search-item-detail-permalink" href="#0">{{
            getMessageDisplayDate(messageSearchResult.sent)
          }}</a>
        </span>
        <span class="message-search-item-text">
          {{ messageSearchResult.text }}
        </span>
      </li>
    </ul>
    <div v-else class="search-result-empty-message">
      No message search results...
    </div>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'components/menu/room/header-title';

.search-body-root {
}

.search-body-title {
  .m-header-title();
}

.search-input-wrapper {
  padding-left: @desktop-menu-left-padding;
  padding-right: @desktop-menu-left-padding;
}

.search-input {
  width: 100%;
}

.search-result-empty-message {
  padding-left: @desktop-menu-left-padding;
  padding-right: @desktop-menu-left-padding;

  color: @menu-item-color;
}

.message-search-list {
  margin-left: 0;
  list-style: none;
}

.message-search-item {
  display: block;
  padding-top: @desktop-menu-left-padding / 2.6;
  padding-left: @desktop-menu-left-padding / 2;
  padding-bottom: @desktop-menu-left-padding / 1.44;
  padding-right: @desktop-menu-left-padding / 2;

  &:hover,
  &:focus {
    cursor: pointer;
    background-color: @room-item-active-bg;
    color: black;
    outline: none;
    text-decoration: none;
  }
}

.message-search-item-detail {
  overflow: hidden;
  display: block;
  margin-bottom: 0.5em;
  padding-right: @desktop-menu-left-padding / 2;

  color: @menu-item-color;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: @search-message-detail-color;
  font-size: 1.3rem;
}

.message-search-item-detail-author-link {
  color: inherit;
}

.message-search-item-detail-permalink {
  color: inherit;
}

.message-search-item-text {
  display: block;

  color: @menu-item-color;
  font-size: 1.4rem;
  font-weight: 300;
  line-height: 1.25em;
  white-space: normal;
  word-break: break-all;
  text-overflow: ellipsis;

  .fonts-loaded & {
    font-size: 1.5rem;
    font-weight: 400;
  }
}
</style>
