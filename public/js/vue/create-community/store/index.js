import _ from 'lodash';
import VuexApiRequest from '../../store/vuex-api-request';
import apiClient from '../../../components/api-client';
import log from '../../../utils/log';
import slugger from '../../../utils/slugger';
import appEvents from '../../../utils/appevents';
import getRoomNameFromTroupeName from 'gitter-web-shared/get-room-name-from-troupe-name';
import validateCommunityName from '../lib/validate-community-name';
import validateCommunitySlug from '../lib/validate-community-slug';
import {
  CREATE_COMMUNITY_STEP_MAIN,
  CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE,
  slugAvailabilityStatusConstants
} from '../constants';

// When testing, disable the debounce so we can test without any weird flakiness
function conditionalDebounce(cb, ...args) {
  if (process.env.TEST_FRIENDLY_DEBOUNCE) {
    return cb;
  }

  return _.debounce(cb, ...args);
}

// Exported for testing
export const orgsVuexRequest = new VuexApiRequest('ORGS', 'orgsRequest');
export const reposVuexRequest = new VuexApiRequest('REPOS', 'reposRequest');
export const communitySubmitVuexRequest = new VuexApiRequest(
  'COMMUNITY_SUBMIT',
  'communitySubmitRequest'
);

// Exported for testing
export const types = {
  MOVE_TO_STEP: 'MOVE_TO_STEP',
  UPDATE_COMMUNITY_NAME: 'UPDATE_COMMUNITY_NAME',
  SET_COMMUNITY_NAME_ERROR: 'SET_COMMUNITY_NAME_ERROR',
  UPDATE_COMMUNITY_SLUG: 'UPDATE_COMMUNITY_SLUG',
  SET_SLUG_AVAILABILITY_STATUS: 'SET_SLUG_AVAILABILITY_STATUS',
  SET_COMMUNITY_SLUG_ERROR: 'SET_COMMUNITY_SLUG_ERROR',
  SET_SELECTED_BACKING_ENTITY: 'SET_SELECTED_BACKING_ENTITY',
  SET_ALLOW_BADGER: 'SET_ALLOW_BADGER',
  SET_ORGS: 'SET_ORGS',
  SET_REPOS: 'SET_REPOS',
  SET_ENTITY_TYPE_TAB_STATE: 'SET_ENTITY_TYPE_TAB_STATE',
  ...orgsVuexRequest.types,
  ...reposVuexRequest.types,
  ...communitySubmitVuexRequest.types
};

export default {
  namespaced: true,
  state: () => ({
    currentStep: CREATE_COMMUNITY_STEP_MAIN,
    communityName: '',
    communityNameError: null,
    communitySlug: '',
    slugAvailabilityStatus: null,
    communitySlugError: null,
    selectedBackingEntity: null,
    allowBadger: true,
    orgs: [],
    repos: [],
    entityTypeTabState: CREATE_COMMUNITY_ENTITY_TYPE_TAB_ORGS_STATE,
    ...orgsVuexRequest.initialState,
    ...reposVuexRequest.initialState,
    ...communitySubmitVuexRequest.initialState
  }),
  mutations: {
    [types.MOVE_TO_STEP](state, newStep) {
      state.currentStep = newStep;
    },
    [types.UPDATE_COMMUNITY_NAME](state, communityName) {
      state.communityName = communityName;
    },
    [types.SET_COMMUNITY_NAME_ERROR](state, newError) {
      state.communityNameError = newError;
    },
    [types.UPDATE_COMMUNITY_SLUG](state, newSlug) {
      state.communitySlug = newSlug;
    },
    [types.SET_SLUG_AVAILABILITY_STATUS](state, newSlugAvailabilityStatus) {
      state.slugAvailabilityStatus = newSlugAvailabilityStatus;
    },
    [types.SET_COMMUNITY_SLUG_ERROR](state, newError) {
      state.communitySlugError = newError;
    },
    [types.SET_SELECTED_BACKING_ENTITY](state, newBackingEntity) {
      state.selectedBackingEntity = newBackingEntity;
    },
    [types.SET_ALLOW_BADGER](state, allowBadger) {
      state.allowBadger = allowBadger;
    },
    [types.SET_ORGS](state, orgs) {
      state.orgs = orgs;
    },
    [types.SET_REPOS](state, repos) {
      state.repos = repos;
    },
    [types.SET_ENTITY_TYPE_TAB_STATE](state, newState) {
      state.entityTypeTabState = newState;
    },
    ...orgsVuexRequest.mutations,
    ...reposVuexRequest.mutations,
    ...communitySubmitVuexRequest.mutations
  },
  getters: {
    gitlabGroups(state) {
      return state.orgs.filter(org => {
        return org.type === 'GL_GROUP';
      });
    },
    githubOrgs(state) {
      return state.orgs.filter(org => {
        return org.type === 'GH_ORG';
      });
    },
    githubRepos(state) {
      return state.repos.filter(repo => {
        return repo.type === 'GH_REPO';
      });
    }
  },
  actions: {
    moveToStep: ({ commit }, newStep) => {
      commit(types.MOVE_TO_STEP, newStep);
    },
    updateCommunityName: ({ state, commit, dispatch }, newCommunityName) => {
      const oldCommunityName = state.communityName;

      commit(types.UPDATE_COMMUNITY_NAME, newCommunityName);

      // If the old auto slug matches the community slug before we set it again here,
      // then we know the slug input is still untouched and we can still autofill
      const oldAutoSlug = slugger(oldCommunityName);
      if (oldAutoSlug === state.communitySlug) {
        commit(types.UPDATE_COMMUNITY_SLUG, slugger(newCommunityName));
        dispatch('checkSlugAvailability');
      }
    },
    updateCommunitySlug: ({ commit, dispatch }, newCommunitySlug) => {
      commit(types.UPDATE_COMMUNITY_SLUG, newCommunitySlug);
      dispatch('checkSlugAvailability');
    },
    setSelectedBackingEntity: ({ commit, dispatch }, newBackingEntity) => {
      commit(types.SET_SELECTED_BACKING_ENTITY, newBackingEntity);

      // The user could have de-selected a backing entity
      if (newBackingEntity) {
        let selectedUri = newBackingEntity.uri;
        if (newBackingEntity.type === 'GH_REPO') {
          selectedUri = getRoomNameFromTroupeName(selectedUri);
        }

        commit(types.UPDATE_COMMUNITY_NAME, selectedUri);
        commit(types.UPDATE_COMMUNITY_SLUG, slugger(selectedUri));
        dispatch('checkSlugAvailability');
      }
    },
    setAllowBadger: ({ commit }, allowBadger) => {
      commit(types.SET_ALLOW_BADGER, allowBadger);
    },
    setEntityTypeTabState: ({ commit }, newTabState) => {
      commit(types.SET_ENTITY_TYPE_TAB_STATE, newTabState);
    },
    fetchInitial: ({ dispatch }) => {
      dispatch('fetchOrgs');
      dispatch('fetchRepos');
    },
    fetchOrgs: ({ commit }) => {
      commit(orgsVuexRequest.requestType);
      return apiClient.user
        .get(`/orgs`)
        .then(orgs => {
          commit(orgsVuexRequest.successType);
          commit(types.SET_ORGS, orgs);
        })
        .catch(err => {
          log.error(err);
          commit(orgsVuexRequest.errorType, err);
        });
    },
    fetchRepos: ({ commit }) => {
      commit(reposVuexRequest.requestType);
      return apiClient.user
        .get(`/repos`)
        .then(repos => {
          commit(reposVuexRequest.successType);
          commit(types.SET_REPOS, repos);
        })
        .catch(err => {
          log.error(err);
          commit(reposVuexRequest.errorType, err);
        });
    },
    checkSlugAvailability: async ({ commit, dispatch }) => {
      // Set pending immediately
      commit(types.SET_SLUG_AVAILABILITY_STATUS, slugAvailabilityStatusConstants.PENDING);

      // Then go off and actually check
      dispatch('_checkSlugAvailabilityDebounced');
    },
    _checkSlugAvailabilityDebounced: conditionalDebounce(async ({ commit, state, dispatch }) => {
      let communitySlugAvailabilityStatus;
      try {
        const res = await apiClient.priv.get('/check-group-uri', {
          uri: state.communitySlug
        });

        // Check to make sure the type matches in the response to what we are trying to create
        //
        // Because of the nature of repo URLs `org/repo` and we only pull off the `repo` part,
        // we need to allow creation when nothing is at that URL
        const type = state.selectedBackingEntity && state.selectedBackingEntity.type;
        if (res.type === type || res.type === null) {
          communitySlugAvailabilityStatus = slugAvailabilityStatusConstants.AVAILABLE;
        } else {
          communitySlugAvailabilityStatus = slugAvailabilityStatusConstants.UNAVAILABLE;
        }
      } catch (err) {
        var status = err.status;
        if (status === 409) {
          communitySlugAvailabilityStatus = slugAvailabilityStatusConstants.UNAVAILABLE;
        } else if (status === 403) {
          communitySlugAvailabilityStatus = slugAvailabilityStatusConstants.GITHUB_CLASH;
        } else if (status === 401) {
          communitySlugAvailabilityStatus = slugAvailabilityStatusConstants.AUTHENTICATION_FAILED;
        } else {
          communitySlugAvailabilityStatus = slugAvailabilityStatusConstants.INVALID;
        }
      }

      commit(types.SET_SLUG_AVAILABILITY_STATUS, communitySlugAvailabilityStatus);

      // Now that the slug availability changed, update the error message
      dispatch('validateCommunity');
    }, 300),
    validateCommunity: ({ commit, state }) => {
      const communityNameError = validateCommunityName(state.communityName);
      commit(types.SET_COMMUNITY_NAME_ERROR, communityNameError);

      const communitySlugError = validateCommunitySlug(
        state.communitySlug,
        state.selectedBackingEntity,
        state.slugAvailabilityStatus
      );
      commit(types.SET_COMMUNITY_SLUG_ERROR, communitySlugError);
    },
    submitCommunity: ({ commit, state, dispatch }) => {
      dispatch('validateCommunity');

      if (!state.communityNameError && !state.communitySlugError) {
        let security = undefined;
        if (state.selectedBackingEntity && state.selectedBackingEntity.type) {
          security = {
            type: state.selectedBackingEntity.type,
            linkPath: state.selectedBackingEntity.uri
          };
        }

        commit(communitySubmitVuexRequest.requestType);
        return apiClient
          .post(`/v1/groups`, {
            name: state.communityName,
            uri: state.communitySlug,
            security,
            addBadge: state.allowBadger,
            allowTweeting: true
          })
          .then(res => {
            commit(communitySubmitVuexRequest.successType);

            const defaultRoomName = res && res.defaultRoom && res.defaultRoom.name;
            const defaultRoomUri = res && res.defaultRoom && res.defaultRoom.uri;

            // Move to the default room
            appEvents.trigger('navigation', '/' + defaultRoomUri, 'chat', defaultRoomName);

            // Then destroy the community create view
            appEvents.trigger('destroy-create-community-view');
          })
          .catch(err => {
            log.error(err);
            commit(communitySubmitVuexRequest.errorType, err);
          });
      }
    }
  }
};
