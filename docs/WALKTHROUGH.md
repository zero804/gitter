# Gitter-Webapp Walkthrough

## Structure

* [`build-scripts/`](../build-scripts): Tools and scripts related to building the application
* [`config/`](../config): Configuration files
* [`modules/`](../modules): Monorepo style submodules
  * [`api-client`](../modules/api-client): Frontend: API client
  * [`app-version`](../modules/app-version): Backend: Application versioning
  * [`appevents`](../modules/appevents): Backend: Global event bus
  * [`avatars`](../modules/avatars): Universal: Avatars module
  * [`backend-muxer`](../modules/backend-muxer): Backend: API router
  * [`cache-wrapper`](../modules/cache-wrapper): Backend: Caching utility
  * [`cdn`](../modules/cdn): Universal: CDN module
  * [`client-env`](../modules/client-env): Universal: Client configuration
  * [`client-error-reporting`](../modules/client-error-reporting): Frontend: Error reporting
  * [`collaborators`](../modules/collaborators): Backend: GitHub Collaborators
  * [`elasticsearch`](../modules/elasticsearch): Backend: Elasticsearch Utils
  * [`env`](../modules/env): Backend: configuration
  * [`fingerprinting`](../modules/fingerprinting): Frontend: Client fingerprinting
  * [`frame-utils`](../modules/frame-utils): Frontend: Client utility
  * [`github`](../modules/github): Backend: GitHub API
  * [`github-backend`](../modules/github-backend): Backend: Muxer GitHub Backend
  * [`google-backend`](../modules/google-backend): Backed - Muxer Google Backend
  * [`groups`](../modules/groups): Backend: Communities/Groups
  * [`i18n`](../modules/i18n): Universal: Internationalization
  * [`identity`](../modules/identity): Backend: Identity Management
  * [`intercom`](../modules/intercom): Backend: Intercom utility
  * [`invites`](../modules/invites): Backend: Invitations
  * [`linkedin-backend`](../modules/linkedin-backend): Backend: Muxer LinkedIn Backend
  * [`live-collection-events`](../modules/live-collection-events): Backend: Realtime event propagation
  * [`mailer`](../modules/mailer): Backend: SMTP mailer
  * [`mongoose-bluebird`](../modules/mongoose-bluebird): Backend: ORM utility
  * [`permissions`](../modules/permissions): Backend: Authorisation Module
  * [`persistence`](../modules/persistence): Backend: MongoDB ORM
  * [`persistence-utils`](../modules/persistence-utils): Backend: MongoDB utility
  * [`presence`](../modules/presence): Backend: User Presence Module
  * [`push-gateways`](../modules/push-gateways): Backend: Push Message Notification
  * [`push-notification-filter`](../modules/push-notification-filter): Backend: Push Message Filtering
  * [`qs`](../modules/qs): Frontend: Query String utility
  * [`serialization`](../modules/serialization): Backend: JSON serialization
  * [`service-worker`](../modules/service-worker): Frontend: Service worker
  * [`slugify`](../modules/slugify): Frontend: Slug generation
  * [`spam-detection`](../modules/spam-detection): Backend: Spam Detection
  * [`split-tests`](../modules/split-tests): Backend: Split-test Utilities
  * [`suggestions`](../modules/suggestions): Backend: Room Suggestions
  * [`templates`](../modules/templates): Backend: Handlebars Template Utilities
  * [`test-utils`](../modules/test-utils): Testing: Test Helpers and Fixture Generators
  * [`text-processor`](../modules/text-processor): Backend: Markdown Processor
  * [`topic-models`](../modules/topic-models): Backend: Topic Common Models
  * [`topic-notifications`](../modules/topic-notifications): Backend: Topic Notifications
  * [`topic-reactions`](../modules/topic-reactions): Backend: Topic Reactions
  * [`topic-serialization`](../modules/topic-serialization): Backend: Topic Serializers
  * [`topics`](../modules/topics): Backend: Topics
  * [`topics-ui`](../modules/topics-ui): Frontend: Topics User-Interface
  * [`twitter`](../modules/twitter): Backend: Twitter Utilities
  * [`twitter-backend`](../modules/twitter-backend): Backend: Muxer Twitter Backend
  * [`uri-resolver`](../modules/uri-resolver): Backend: URI resolution
  * [`user-serialization`](../modules/user-serialization): Backend: User Serialization
  * [`utils`](../modules/utils): Backend: Utilities
  * [`validators`](../modules/validators): Backend: Validators

* [`public/`](../public): Public assets for https://gitter.im
* [`redis-lua/`](../redis-lua): Lua scripts for Redis
* [`server/`](../server): https://gitter.im backend
* [`shared/`](../shared): Isomorphic Javascript shared by frontend and backend.
