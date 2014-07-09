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
CLEAN_FILES = $(shell echo output/ coverage/ cobertura-coverage.xml html-report/ public-processed/ )
else
CLEAN_FILES = $(shell echo output/ coverage/ cobertura-coverage.xml html-report/ public-processed/ public-compile-cache/)
endif

PUBLIC_EXCLUDING_JS = $(shell ls -d public/*|grep -v ^public/js$)

.PHONY: clean test perf-test-xunit perf-test test-xunit test-in-browser test-in-browser-xunit test-coverage prepare-for-end-to-end-testing end-to-end-test

clean:
	rm -rf $(CLEAN_FILES)
	
test:
	NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter spec \
		--timeout 10000 \
		--recursive \
		$(TESTS) || true
	
test-coverage:
	rm -rf ./coverage/ cobertura-coverage.xml
	mkdir -p output
	find $(TESTS) -iname "*test.js" | NODE_ENV=test XUNIT_FILE=output/test-reports/integration_cov.xml xargs ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- --timeout 10000 --reporter xunit-file || true
	./node_modules/.bin/istanbul report cobertura

perf-test-xunit:
	npm install
	mkdir -p output/test-reports
	NODE_ENV=test XUNIT_FILE=output/test-reports/performance.xml ./node_modules/.bin/mocha \
		--reporter xunit-file \
		--timeout 100000 \
		--recursive \
		$(PERF_TESTS) || true

perf-test:
	npm install
	NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter spec \
		--timeout 100000 \
		--recursive \
		$(PERF_TESTS) || true

test-xunit:
	mkdir -p output/test-reports
	NODE_ENV=test XUNIT_FILE=output/test-reports/integration.xml ./node_modules/.bin/mocha \
		--reporter xunit-file \
		--timeout 10000 \
		--recursive \
		$(TESTS) || true

test-in-browser:
	node_modules/.bin/mocha-phantomjs $(BASE_URL)/test/in-browser/test || true

test-in-browser-xunit:
	mkdir -p output/test-reports
	node_modules/.bin/mocha-phantomjs \
		--timeout 30000 \
		--reporter xunit \
		$(BASE_URL)/test/in-browser/test > ../../output/test-reports/in-browser.xml || true

rest-test-xunit:
	mkdir -p output/test-reports
	NODE_ENV=test BASE_URL=$(BASE_URL) node_modules/.bin/mocha \
		--timeout 4000 \
		--reporter xunit \
		test/rest > output/test-reports/rest.xml || true

prepare-for-end-to-end-testing:
	curl https://raw.github.com/pypa/pip/master/contrib/get-pip.py > /tmp/get-pip.py
	sudo python /tmp/get-pip.py
	test/end-to-end/e2etests/install-libs.sh
	unzip -o test/end-to-end/chromedriver/chromedriver_mac_26.0.1383.0.zip -d test/end-to-end/chromedriver/

end-to-end-test:
	MAIL_HOST=$(MAIL_HOST) \
	MAIL_PORT=$(MAIL_PORT) \
	nosetests --nologcapture --processes=5 --process-timeout=120 --attr '!unreliable','thread_safe' --all-modules test/end-to-end/e2etests || true
	MAIL_HOST=$(MAIL_HOST) \
	MAIL_PORT=$(MAIL_PORT) \
	nosetests --nologcapture --attr '!unreliable','!thread_safe' --all-modules test/end-to-end/e2etests || true

end-to-end-test-saucelabs-chrome:
	@mkdir -p ./output/test-reports
	@echo Testing $(BETA_SITE) with chrome at saucelabs.com thread safe tests in parallel
	@REMOTE_EXECUTOR=$(SAUCELABS_REMOTE) \
	DRIVER=REMOTECHROME \
	BASE_URL=$(BETA_SITE) \
	MAIL_HOST=$(MAIL_HOST) \
	MAIL_PORT=$(MAIL_PORT) \
		nosetests \
			--processes=30 --process-timeout=180 \
			--attr '!unreliable','thread_safe' \
			--nologcapture --with-xunit --xunit-file=./output/test-reports/selenium-remote-chrome-1.xml \
			--all-modules test/end-to-end/e2etests  || true
	@echo Testing $(BETA_SITE) with chrome at saucelabs.com thread unsafe tests in serial
	@REMOTE_EXECUTOR=$(SAUCELABS_REMOTE) \
	DRIVER=REMOTECHROME \
	BASE_URL=$(BETA_SITE) \
	MAIL_HOST=$(MAIL_HOST) \
	MAIL_PORT=$(MAIL_PORT) \
		nosetests \
			--attr '!unreliable','!thread_safe' \
			--nologcapture --with-xunit --xunit-file=./output/test-reports/selenium-remote-chrome-2.xml \
			--all-modules test/end-to-end/e2etests  || true

end-to-end-test-saucelabs-ie10:
	@echo Testing $(BETA_SITE) with ie10 at saucelabs.com thread safe tests in parallel
	@REMOTE_EXECUTOR=$(SAUCELABS_REMOTE) \
	DRIVER=REMOTEIE \
	BASE_URL=$(BETA_SITE) \
	MAIL_HOST=$(MAIL_HOST) \
	MAIL_PORT=$(MAIL_PORT) \
		nosetests \
			--processes=30 --process-timeout=240 \
			--attr '!unreliable','thread_safe' \
			--nologcapture --with-xunit --xunit-file=./output/test-reports/selenium-remote-ie10-1.xml \
			--all-modules test/end-to-end/e2etests  || true
	@echo Testing $(BETA_SITE) with ie10 at saucelabs.com thread unsafe tests in serial
	@REMOTE_EXECUTOR=$(SAUCELABS_REMOTE) \
	DRIVER=REMOTEIE \
	BASE_URL=$(BETA_SITE) \
	MAIL_HOST=$(MAIL_HOST) \
	MAIL_PORT=$(MAIL_PORT) \
		nosetests \
			--attr '!unreliable','!thread_safe' \
			--nologcapture --with-xunit --xunit-file=./output/test-reports/selenium-remote-ie10-2.xml \
			--all-modules test/end-to-end/e2etests || true

end-to-end-test-saucelabs-android:
	@echo Testing $(BETA_SITE) with android at saucelabs.com
	@REMOTE_EXECUTOR=$(SAUCELABS_REMOTE) \
	DRIVER=REMOTEANDROID \
	BASE_URL=$(BETA_SITE) \
	MAIL_HOST=$(MAIL_HOST) \
	MAIL_PORT=$(MAIL_PORT) \
	nosetests --nologcapture \
		--attr 'phone_compatible' \
		--with-xunit \
		--xunit-file=./output/test-reports/selenium-remote-android.xml \
		--all-modules test/end-to-end/e2etests || true

docs: test-docs

test-docs:
	make test REPORTER=doc \
		| cat docs/head.html - docs/tail.html \
		> docs/test.html

npm:
	#rm -f npm-shrinkwrap.json
	#npm prune
	npm install
	#npm shrinkwrap

lint-configs: config/*.json
	set -e && for i in $?; do (./node_modules/.bin/jsonlint $$i > /dev/null); done

grunt: clean lint-configs
	mkdir output
	mkdir -p public-processed/js
	for i in $(PUBLIC_EXCLUDING_JS); \
		do cp -R $$i public-processed/; \
	done
	if [ -d public-compile-cache/js/ ] && [ -n $$(find public-compile-cache/js/ -maxdepth 1 -type f -name '*' -print -quit) ]; then cp public-compile-cache/js/* public-processed/js/; fi
	./build-scripts/copy-templates.sh
	grunt -no-color less requirejs
	./build-scripts/selective-js-compile.sh
	rm -rf public-compile-cache
	mkdir -p public-compile-cache/js
	cp public-processed/js/*.min.js public-processed/js/*.md5 public-compile-cache/js
	./build-scripts/gzip-processed.sh

sprites:
	@mkdir -p output/temp-sprites
	@node scripts/generate-service-sprite.js

security-check:
	grunt retire
	grunt validate-shrinkwrap

version-files:
	@echo GIT COMMIT: $(GIT_COMMIT)
	@echo GIT BRANCH: $(GIT_BRANCH)
	echo $(ASSET_TAG) > ASSET_TAG
	echo $(GIT_COMMIT) > GIT_COMMIT
	echo $(GIT_BRANCH) > VERSION 

test-reinit-data: maintain-data test post-test-maintain-data

reset-test-data: maintain-data

upgrade-data:
	./scripts/upgrade-data.sh

maintain-data:
	MODIFY=true ./scripts/datamaintenance/execute.sh || true

# Make a second target
post-test-maintain-data:
	MODIFY=true ./scripts/datamaintenance/execute.sh || true

tarball:
	mkdir -p output
	find . -type f -not -name ".*"| grep -Ev '^\./(\.|coverage/|output/|assets/|mongo-backup-|scripts/mongo-backup-|node_modules/).*'|tar -cv --files-from - |gzip -9 - > output/troupe.tgz
	tar -cvzf output/assets.tgz -C public-processed .

search-js-console:
	if (find public/js -name "*.js" ! -path "*libs*" ! -name log.js |xargs grep -q '\bconsole\b'); then \
		echo console references in the code; \
		find public/js -name "*.js" ! -path "*libs*" ! -name log.js |xargs grep '\bconsole\b'; \
		exit 1; \
	fi

	if (find public/js -name "*.js" ! -path "*libs*" |xargs grep -q '\bcontext..\.troupe'); then \
		echo context\(\).troupe references in code. Use context.troupe.get\('X'\); \
		find public/js -name "*.js" ! -path "*libs*" |xargs grep '\bcontext..\.troupe'; \
		exit 1; \
	fi

validate-source: search-js-console

continuous-integration: clean validate-source npm grunt security-check version-files upgrade-data reset-test-data test-xunit tarball

continuous-integration-no-test: clean validate-source npm grunt version-files upgrade-data reset-test-data tarball

post-deployment-tests: npm test-in-browser-xunit rest-test-xunit end-to-end-test-saucelabs-chrome end-to-end-test-saucelabs-ie10 end-to-end-test-saucelabs-android

build: clean validate-source npm grunt version-files upgrade-data test-xunit

.PHONY: test docs test-docs clean

clean-client-libs:
	rm -rf public/repo

clean-temp-client-libs:
	rm -rf output/client-libs/ output/js-temp


fetch-client-libs:
	bower install

make-client-libs:
	grunt client-libs # --disableMinifiedSource=true

make-jquery:
	npm install
	./node_modules/.bin/jquery-builder -v 2.0.3 -e deprecated -m > public/repo/jquery/jquery.js

install-client-libs:
	ls -d output/client-libs/*|sed -e 's!output/client-libs/!public/repo/!'|sed -e 's!retina.js-js!retina!'|sed -e 's!typeahead.js!typeahead!'|xargs mkdir -p
	cp output/client-libs/almond/almond.js public/repo/almond/almond.js
	cp output/client-libs/assert/assert-amd.js public/repo/assert/assert.js
	cp output/client-libs/backbone/backbone-amd.js public/repo/backbone/backbone.js
	cp output/client-libs/backbone.babysitter/lib/amd/backbone.babysitter.min.js public/repo/backbone.babysitter/backbone.babysitter.js
	cp output/client-libs/backbone.keys/dist/backbone.keys.min.js public/repo/backbone.keys/backbone.keys.js
	cp output/client-libs/backbone.wreqr/lib/amd/backbone.wreqr.min.js public/repo/backbone.wreqr/backbone.wreqr.js
	cp output/client-libs/bootstrap/js/bootstrap-tooltip.js public/repo/bootstrap/tooltip.js
	cp output/client-libs/cocktail/cocktail-amd.js public/repo/cocktail/cocktail.js
	cp output/client-libs/cubism/cubism.v1.min.js public/repo/cubism/cubism.js
	cp output/client-libs/d3/d3.min.js public/repo/d3/d3.js
	cp output/client-libs/expect/expect-amd.js public/repo/expect/expect.js
	cp output/client-libs/faye/faye-browser.js public/repo/faye/faye.js
	cp output/client-libs/filtered-collection/backbone-filtered-collection-amd.js public/repo/filtered-collection/filtered-collection.js
	cp output/client-libs/marionette/lib/core/amd/backbone.marionette.min.js public/repo/marionette/marionette.js
	cp output/client-libs/hbs/hbs.js public/repo/hbs/hbs.js
	cp output/client-libs/hbs/hbs/i18nprecompile.js public/repo/hbs/i18nprecompile.js
	cp output/client-libs/hbs/Handlebars.js public/repo/hbs/Handlebars.js
	cp output/client-libs/hbs/hbs/json2.js public/repo/hbs/json2.js
	cp output/client-libs/jquery.validation/jquery.validate-amd.js public/repo/jquery.validation/jquery.validation.js
	cp output/client-libs/jquery-carousel/jquery.carouFredSel-6.2.1.amd.js public/repo/jquery-carousel/jquery.carouFredSel-6.2.1.js
	cp output/client-libs/hammerjs/dist/jquery.hammer.min.js public/repo/hammerjs/jquery.hammer.js
	cp output/client-libs/mocha/mocha-amd.js public/repo/mocha/mocha.js
	cp output/client-libs/mocha/mocha.css public/repo/mocha/mocha.css
	cp output/client-libs/moment/min/moment.min.js public/repo/moment/moment.js
	cp output/client-libs/nanoscroller/jquery.nanoscroller.js public/repo/nanoscroller/nanoscroller.js
	cp output/client-libs/requirejs/index.js public/repo/requirejs/requirejs.js
	cp output/client-libs/retina.js-js/src/retina.js public/repo/retina/retina.js
	cp output/client-libs/scrollfix/scrollfix-amd.js public/repo/scrollfix/scrollfix.js
	cp output/client-libs/underscore/underscore-amd.js public/repo/underscore/underscore.js
	# cp output/client-libs/zeroclipboard/ZeroClipboard.js public/repo/zeroclipboard/zeroclipboard.js
	cp output/client-libs/zeroclipboard/zeroclipboard-amd.js public/repo/zeroclipboard/zeroclipboard.js
	cp output/client-libs/zeroclipboard/ZeroClipboard.swf public/repo/zeroclipboard/

client-libs: clean-temp-client-libs make-jquery fetch-client-libs make-client-libs clean-client-libs install-client-libs
