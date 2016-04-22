TESTS = test/integration
END_TO_END_TESTS = test/end-to-end
PERF_TESTS = test/performance
MOCHA_REPORTER =
DATA_MAINT_SCRIPTS = $(shell find ./scripts/datamaintenance -name '*.sh')
SAUCELABS_REMOTE = http://trevorah:d6b21af1-7ae7-4bed-9c56-c5f9d290712b@ondemand.saucelabs.com:80/wd/hub
BETA_SITE = https://beta.trou.pe
BASE_URL = http://localhost:5000
MAIL_HOST = localhost
MAIL_PORT = 2525
GIT_BRANCH ?= $(shell git rev-parse --abbrev-ref HEAD)
GIT_COMMIT ?= $(shell git rev-parse HEAD)
ASSET_TAG_PREFIX =
ASSET_TAG = $(ASSET_TAG_PREFIX)$(shell echo $(GIT_COMMIT)|cut -c 1-6)
EMBEDDED_NODE_ENV ?= prod
EMBEDDED_WWW_DIRECTORY ?= ~/code/gitter/ios/Troupe/www/build
ifeq ($(FAST_BUILD), 1)
CLEAN_FILES = $(shell echo output/ coverage/ cobertura-coverage.xml html-report/ public-processed/ public/styles/)
else
CLEAN_FILES = $(shell echo output/ coverage/ cobertura-coverage.xml html-report/ public-processed/ public/styles/ public-compile-cache/)
endif
PATH := ./node_modules/.bin:$(PATH)

.PHONY: build clean test npm sprites npm-quick npm-full performance-tests

validate: npm
	gulp validate

build: clean npm validate test test-lua submit-to-coveralls package

test-lua:
	echo lua tests disabled #gulp test-redis-lua

package: npm
	gulp package

submit-to-coveralls: npm test
	gulp submit-coveralls-post-tests

clean:
	rm -rf output

test: clean npm
	mkdir -p output/
	./exec-in-docker ./node_modules/.bin/gulp test-docker

print-nodejs-version:
	node --version
	npm --version

npm-quick: print-nodejs-version
	npm prune
	npm install

npm-full: print-nodejs-version
	npm cache clean
	rm -rf node_modules/
	npm install

npm:
	make npm-quick || make npm-full

sprites:
	@mkdir -p output/temp-sprites
	@node scripts/generate-service-sprite.js

test-reinit-data: maintain-data test post-test-maintain-data

reset-test-data: maintain-data

upgrade-data:
	./scripts/upgrade-data.sh

maintain-data:
	MODIFY=true ./scripts/datamaintenance/execute.sh || true

# Make a second target
post-test-maintain-data:
	MODIFY=true ./scripts/datamaintenance/execute.sh || true

send-to-sonar:
	( gulp sonar | grep -v DEBUG | grep -v '^\s*$$' ) || true

continuous-integration: build send-to-sonar

performance-tests: clean npm
	gulp test-perf

clean-embedded-chat:
	rm -rf output/embedded output/embedded.tgz

embedded-chat: clean
	mkdir -p output/embedded/www/mobile
	NODE_ENV=$(EMBEDDED_NODE_ENV) ./build-scripts/render-embedded-chat.js  -o output/embedded/www/mobile/embedded-chat.html
	gulp embedded-package
	ls output/assets/js/*.js  >> output/embedded-resources.txt
	ls output/assets/styles/*.css  >> output/embedded-resources.txt

	ls output/assets/images/emoji/*  >> output/embedded-resources.txt

	./build-scripts/extract-urls.js output/assets/styles/mobile-native-chat.css >> output/embedded-resources.txt
	./build-scripts/copy-embedded-resources.sh

embedded-chat-copy: embedded-chat
	rm -rf $(EMBEDDED_WWW_DIRECTORY)
	mkdir -p $(EMBEDDED_WWW_DIRECTORY)
	cp -R output/embedded/www/* $(EMBEDDED_WWW_DIRECTORY)/

# make-jquery:
# 	npm install
# 	./node_modules/.bin/jquery-builder -v 2.0.3 -e deprecated -m > public/repo/jquery/jquery.js
