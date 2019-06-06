<script>
import _ from 'underscore';
import { mapState, mapActions } from 'vuex';

import LoadingSpinner from '../../components/loading-spinner.vue';
import SearchBodyMessageResultItem from './search-body-message-result-item.vue';

const SEARCH_DEBOUNCE_INTERVAL = 1000;

export default {
  name: 'SearchBody',
  components: {
    LoadingSpinner,
    SearchBodyMessageResultItem
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
      <search-body-message-result-item
        v-for="messageSearchResult in messageSearchResults"
        :key="messageSearchResult.id"
        :message-search-result="messageSearchResult"
      />
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
</style>
