build:
	@./bin/build
	@echo 'Wrote ./blackbox.js'

clean:
	@rm -f blackbox.js

watch:
	@./bin/watch

test:
	@BLACKBOX_DEV=1 ./node_modules/.bin/mocha --ui bdd -R list spec/javascripts/*.spec.js spec/javascripts/**/*.spec.js

test-watch:
	@BLACKBOX_DEV=1 ./node_modules/.bin/mocha --ui bdd -R list -w spec/javascripts/*.spec.js spec/javascripts/**/*.spec.js

coverage:
	@jscoverage --no-highlight lib lib-cov
	@BLACKBOX_COV=1 ./node_modules/.bin/mocha --ui bdd -R html-cov spec/javascripts/*.spec.js spec/javascripts/**/*.spec.js > coverage.html
	@rm -rf lib-cov
	@echo 'Wrote ./coverage.html'

.PHONY: build clean watch test test-watch coverage
