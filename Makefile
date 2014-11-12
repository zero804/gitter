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

.PHONY: build clean test npm sprites 
	
build: clean npm
	gulp

clean:
	rm -rf output
	
test:
	gulp test

npm:
	npm install

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

clean-embedded-chat:
	rm -rf output/embedded output/embedded.tgz

embedded-chat:
	mkdir -p output/embedded/mobile
	NODE_ENV=prod ./build-scripts/render-embedded-chat.js  -o output/embedded/mobile/embedded-chat.html
	echo public-processed/js/core-libraries.min.js > output/embedded-resources.txt
	echo public-processed/js/mobile-native-embedded-chat.min.js >> output/embedded-resources.txt
	echo public-processed/styles/mobile-native-chat.css >> output/embedded-resources.txt
	ls public-processed/images/emoji/*  >> output/embedded-resources.txt
	./build-scripts/extract-urls.js public-processed/styles/mobile-native-chat.css >> output/embedded-resources.txt
	./build-scripts/copy-embedded-resources.sh


# make-jquery:
# 	npm install
# 	./node_modules/.bin/jquery-builder -v 2.0.3 -e deprecated -m > public/repo/jquery/jquery.js

