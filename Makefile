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
ifeq ($(FAST_BUILD), 1)
CLEAN_FILES = $(shell echo output/ coverage/ cobertura-coverage.xml html-report/ public-processed/ public/styles/)
else
CLEAN_FILES = $(shell echo output/ coverage/ cobertura-coverage.xml html-report/ public-processed/ public/styles/ public-compile-cache/)
endif
PATH := ./node_modules/.bin:$(PATH)

.PHONY: build clean test npm sprites npm-quick npm-full performance-tests

build: clean npm
	gulp

clean:
	rm -rf output

test:
	gulp test

npm-quick:
	npm prune
	npm install

npm-full:
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

continuous-integration: build

performance-tests: clean npm
	gulp test-perf

clean-embedded-chat:
	rm -rf output/embedded output/embedded.tgz

embedded-chat:
	mkdir -p output/embedded/www/mobile
	NODE_ENV=prod ./build-scripts/render-embedded-chat.js  -o output/embedded/www/mobile/embedded-chat.html
	echo output/assets/js/vendor.js > output/embedded-resources.txt
	echo output/assets/js/mobile-native-embedded-chat.js >> output/embedded-resources.txt
	echo output/assets/styles/mobile-native-chat.css >> output/embedded-resources.txt
	ls output/assets/images/emoji/*  >> output/embedded-resources.txt
	./build-scripts/extract-urls.js output/assets/styles/mobile-native-chat.css >> output/embedded-resources.txt
	./build-scripts/copy-embedded-resources.sh


# make-jquery:
# 	npm install
# 	./node_modules/.bin/jquery-builder -v 2.0.3 -e deprecated -m > public/repo/jquery/jquery.js
