TESTS = test/integration
END_TO_END_TESTS = test/end-to-end
PERF_TESTS = test/performance
MOCHA_REPORTER =
DATA_MAINT_SCRIPTS = $(shell find ./scripts/datamaintenance -name '*.sh')

clean:
	rm -rf public-processed/ output/ coverage/ cobertura-coverage.xml html-report/

test:
	NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter dot \
		--timeout 10000 \
		--recursive \
		--ignore-leaks \
		$(TESTS)

perf-test-xunit:
	NODE_ENV=test XUNIT_FILE=output/test-reports/performance.xml ./node_modules/.bin/mocha \
		--reporter xunit-file \
		--timeout 100000 \
		--recursive \
		--ignore-leaks \
		$(PERF_TESTS)

perf-test:
	NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter dot \
		--timeout 100000 \
		--recursive \
		--ignore-leaks \
		$(PERF_TESTS)

test-xunit:
	mkdir -p output/test-reports
	NODE_ENV=test XUNIT_FILE=output/test-reports/integration.xml ./node_modules/.bin/mocha \
		--reporter xunit-file \
		--timeout 10000 \
		--recursive \
		--ignore-leaks \
		$(TESTS)

test-in-browser:
	mkdir -p output/test-reports
	test/in-browser/run-phantom-tests.sh

test-coverage:
	rm -rf ./coverage/ ./html-report/
	./node_modules/.bin/istanbul instrument server/ -o coverage/
	mkdir -p output
	ISTANBUL_REPORTERS=text-summary,html,cobertura TROUPE_COVERAGE=1 NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter mocha-istanbul \
		--timeout 10000 \
		--recursive \
		--ignore-leaks \
		$(TESTS) || true
	rm -rf coverage/

prepare-for-end-to-end-testing:
	curl https://raw.github.com/pypa/pip/master/contrib/get-pip.py > /tmp/get-pip.py
	sudo python /tmp/get-pip.py
	test/end-to-end/e2etests/install-libs.sh
	unzip -o test/end-to-end/chromedriver/chromedriver_mac_26.0.1383.0.zip -d test/end-to-end/chromedriver/

end-to-end-test:
	mkdir -p ./output/test-reports/
	nosetests -s -v --with-xunit --xunit-file=./output/test-reports/nosetests.xml --all-modules test/end-to-end/e2etests/

docs: test-docs

test-docs:
	make test REPORTER=doc \
		| cat docs/head.html - docs/tail.html \
		> docs/test.html

npm:
	npm prune
	npm install

grunt:
	grunt -no-color process

version-files:
	@echo GIT COMMIT: $(GIT_COMMIT)
	@echo GIT BRANCH: $(GIT_BRANCH)
	echo $(GIT_COMMIT) > GIT_COMMIT
	echo $(GIT_BRANCH) > VERSION

test-reinit-data: maintain-data init-test-data test post-test-maintain-data

upgrade-data:
	./scripts/upgrade-data.sh

maintain-data:
	$(foreach var,$(DATA_MAINT_SCRIPTS),$(var);)

# Make a second target
post-test-maintain-data:
	$(foreach var,$(DATA_MAINT_SCRIPTS),$(var);)


init-test-data:
	./scripts/dataupgrades/005-test-users/001-update.sh

tarball:
	mkdir -p output
	find . -type f -not -name ".*"| grep -Ev '^\./(\.|node_modules/|output/|assets/|mongo-backup-|scripts/mongo-backup-).*'|tar -cv --files-from - |gzip -9 - > output/troupe.tgz

search-js-console:
	if (find public/js -name "*.js" ! -path "*libs*" ! -name log.js |xargs grep -q '\bconsole\b'); then \
		echo console references in the code; \
		find public/js -name "*.js" ! -path "*libs*" ! -name log.js |xargs grep '\bconsole\b'; \
		exit 1; \
	fi

validate-source: search-js-console

continuous-integration: clean validate-source npm grunt version-files upgrade-data init-test-data test-xunit test-coverage tarball

post-deployment-tests: test-in-browser end-to-end-test

build: clean validate-source npm grunt version-files upgrade-data test-xunit

.PHONY: test docs test-docs clean

clean-client-libs:
	rm -rf output/client-libs/ public/repo output/js-temp

fetch-client-libs:
	bower install

install-client-libs:
	grunt client-libs # --disableMinifiedSource=true
	ls -d output/client-libs/*|sed -e 's!output/client-libs/!public/repo/!'|sed -e 's!retina.js-js!retina!'|sed -e 's!typeahead.js!typeahead!'|xargs mkdir -p
	cp output/client-libs/almond/almond.js public/repo/almond/almond.js
	cp output/client-libs/assert/assert-amd.js public/repo/assert/assert.js
	cp output/client-libs/backbone/backbone-amd.js public/repo/backbone/backbone.js
	cp output/client-libs/backbone.babysitter/lib/amd/backbone.babysitter.min.js public/repo/backbone.babysitter/backbone.babysitter.js
	cp output/client-libs/backbone.keys/dist/backbone.keys.min.js public/repo/backbone.keys/backbone.keys.js
	cp output/client-libs/backbone.wreqr/lib/amd/backbone.wreqr.min.js public/repo/backbone.wreqr/backbone.wreqr.js
	cp output/client-libs/bootstrap/bootstrap-tooltip.js public/repo/bootstrap/tooltip.js
	cp output/client-libs/bootstrap/bootstrap-typeahead.js public/repo/bootstrap/typeahead.js
	cp output/client-libs/cubism/cubism.v1.min.js public/repo/cubism/cubism.js
	cp output/client-libs/d3/d3.min.js public/repo/d3/d3.js
	cp output/client-libs/expect/expect-amd.js public/repo/expect/expect.js
	cp output/client-libs/faye/faye-browser.js public/repo/faye/faye.js
	cp output/client-libs/filtered-collection/backbone-filtered-collection-amd.js public/repo/filtered-collection/filtered-collection.js
	cp output/client-libs/marionette/lib/core/amd/backbone.marionette.min.js public/repo/marionette/marionette.js
	cp output/client-libs/fine-uploader/fine-uploader.js public/repo/fine-uploader/fine-uploader.js
	cp output/client-libs/fine-uploader/client/fineuploader.css public/repo/fine-uploader/fineuploader.less
	cp output/client-libs/hbs/hbs.js public/repo/hbs/hbs.js
	cp output/client-libs/hbs/hbs/i18nprecompile.js public/repo/hbs/i18nprecompile.js
	cp output/client-libs/hbs/Handlebars.js public/repo/hbs/Handlebars.js
	cp output/client-libs/hbs/hbs/json2.js public/repo/hbs/json2.js
	cp output/client-libs/jquery/jquery.min.js public/repo/jquery/jquery.js
	cp output/client-libs/jquery/jquery-migrate-amd.js public/repo/jquery/jquery-migrate.js
	cp output/client-libs/jquery-placeholder/jquery.placeholder-amd.js public/repo/jquery-placeholder/jquery-placeholder.js
	cp output/client-libs/jquery.validation/jquery.validate-amd.js public/repo/jquery.validation/jquery.validation.js
	cp output/client-libs/mocha/mocha-amd.js public/repo/mocha/mocha.js
	cp output/client-libs/mocha/mocha.css public/repo/mocha/mocha.css
	cp output/client-libs/moment/min/moment.min.js public/repo/moment/moment.js
	cp output/client-libs/nanoscroller/jquery.nanoscroller.js public/repo/nanoscroller/nanoscroller.js
	cp output/client-libs/requirejs/index.js public/repo/requirejs/requirejs.js
	cp output/client-libs/retina.js-js/src/retina.js public/repo/retina/retina.js
	cp output/client-libs/scrollfix/scrollfix.js public/repo/scrollfix/scrollfix.js
	cp output/client-libs/typeahead.js/typeahead.js public/repo/typeahead/typeahead.js
	cp output/client-libs/underscore/underscore-amd.js public/repo/underscore/underscore.js
	# cp output/client-libs/zeroclipboard/ZeroClipboard.js public/repo/zeroclipboard/zeroclipboard.js
	cp output/client-libs/zeroclipboard/zeroclipboard-amd.js public/repo/zeroclipboard/zeroclipboard.js
	cp output/client-libs/zeroclipboard/ZeroClipboard.swf public/repo/zeroclipboard/
	cp output/client-libs/zepto/zepto-amd.js public/repo/zepto/zepto.js

client-libs: clean-client-libs fetch-client-libs install-client-libs
