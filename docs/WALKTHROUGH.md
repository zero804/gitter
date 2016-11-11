# Gitter-Webapp Walkthrough

## Structure

* [`build-scripts/`](../build-scripts): Tools and scripts related to building the application
* [`config/`](../config): Configuration files
* [`modules/`](../modules): Monorepo style submodules
  * [api-client](../modules/api-client)
  * [app-version](../modules/app-version)
  * [appevents](../modules/appevents)
  * [avatars](../modules/avatars)
  * [backend-muxer](../modules/backend-muxer)
  * [cache-wrapper](../modules/cache-wrapper)
  * [cdn](../modules/cdn)
  * [client-env](../modules/client-env)
  * [client-error-reporting](../modules/client-error-reporting)
  * [collaborators](../modules/collaborators)
  * [elasticsearch](../modules/elasticsearch)
  * [env](../modules/env)
  * [fingerprinting](../modules/fingerprinting)
  * [frame-utils](../modules/frame-utils)
  * [github](../modules/github)
  * [github-backend](../modules/github-backend)
  * [google-backend](../modules/google-backend)
  * [groups](../modules/groups)
  * [i18n](../modules/i18n)
  * [identity](../modules/identity)
  * [intercom](../modules/intercom)
  * [invites](../modules/invites)
  * [linkedin-backend](../modules/linkedin-backend)
  * [live-collection-events](../modules/live-collection-events)
  * [mailer](../modules/mailer)
  * [mongoose-bluebird](../modules/mongoose-bluebird)
  * [permissions](../modules/permissions)
  * [persistence](../modules/persistence)
  * [persistence-utils](../modules/persistence-utils)
  * [presence](../modules/presence)
  * [push-gateways](../modules/push-gateways)
  * [push-notification-filter](../modules/push-notification-filter)
  * [qs](../modules/qs)
  * [serialization](../modules/serialization)
  * [service-worker](../modules/service-worker)
  * [slugify](../modules/slugify)
  * [spam-detection](../modules/spam-detection)
  * [split-tests](../modules/split-tests)
  * [suggestions](../modules/suggestions)
  * [templates](../modules/templates)
  * [test-utils](../modules/test-utils)
  * [text-processor](../modules/text-processor)
  * [topic-models](../modules/topic-models)
  * [topic-notifications](../modules/topic-notifications)
  * [topic-reactions](../modules/topic-reactions)
  * [topic-serialization](../modules/topic-serialization)
  * [topics](../modules/topics)
  * [topics-ui](../modules/topics-ui)
  * [twitter](../modules/twitter)
  * [twitter-backend](../modules/twitter-backend)
  * [uri-resolver](../modules/uri-resolver)
  * [user-serialization](../modules/user-serialization)
  * [utils](../modules/utils)
  * [validators](../modules/validators)
   
* [`public/`](../public): Public assets for https://gitter.im
* [`redis-lua/`](../redis-lua): Lua scripts for Redis
* [`server/`](../server): https://gitter.im backend
* [`shared/`](../shared): Isomorphic Javascript shared by frontend and backend.

