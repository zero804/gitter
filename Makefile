TESTS = test/integration
END_TO_END_TESTS = test/end-to-end
PERF_TESTS = test/performance
MOCHA_REPORTER =

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
	if [ -d ./coverage/ ]; then rm -r ./coverage/; fi
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
	nosetests -v --all-modules test/end-to-end/e2etests/

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


upgrade-data:
	./scripts/upgrade-data.sh


tarball:
	mkdir -p output
	find . -type f -not -name ".*"| grep -Ev '^\./(\.|node_modules/|output/|assets/|mongo-backup-|scripts/mongo-backup-).*'|tar -cv --files-from - |gzip -9 - > output/troupe.tgz


continuous-integration: clean npm grunt version-files upgrade-data test-xunit test-coverage tarball

post-deployment-tests: test-in-browser end-to-end-test

build: npm grunt

.PHONY: test docs test-docs clean
