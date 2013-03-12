TESTS = test/integration
END_TO_END_TESTS = test/end-to-end

REPORTER = dot

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--timeout 2000 \
		--recursive \
		--ignore-leaks \
		$(TESTS)

end-to-end-test:
	@NODE_ENV=test casperjs test \
		$(END_TO_END_TESTS)/casper \
		--url=http://localhost:5000

docs: test-docs

test-docs:
	make test REPORTER=doc \
		| cat docs/head.html - docs/tail.html \
		> docs/test.html

.PHONY: test-cov test docs test-docs clean
