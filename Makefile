TESTS = test/integration
END_TO_END_TESTS = test/end-to-end

REPORTER = dot

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 10000 \
		--recursive \
		--ignore-leaks \
		$(TESTS)

prepare-for-end-to-end-testing:
	curl https://raw.github.com/pypa/pip/master/contrib/get-pip.py > /tmp/get-pip.py
	sudo python /tmp/get-pip.py
	test/end-to-end/e2etests/install-libs.sh
	unzip -o test/end-to-end/chromedriver/chromedriver_mac_26.0.1383.0.zip -d test/end-to-end/chromedriver/

end-to-end-test:
	nosetests --all-modules test/end-to-end/e2etests/

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
	if [ -d output ]; then rm -r output; fi
	mkdir -p output
	find . -type f -not -name ".*"| grep -Ev '^\./(\.|node_modules/|output/|assets/|mongo-backup-|scripts/mongo-backup-).*'|tar -cv --files-from - |gzip -9 - > output/troupe.tgz


continuous-integration: npm grunt version-files upgrade-data test tarball

build: npm grunt

.PHONY: test-cov test docs test-docs clean
