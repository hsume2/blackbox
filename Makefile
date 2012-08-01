build:
	@./bin/build
	@echo 'Built blackbox.js'

clean:
	@rm -f blackbox.js

watch:
	@./bin/watch

test:
	@./node_modules/.bin/mocha --ui bdd -R list spec/javascripts/*.spec.js spec/javascripts/**/*.spec.js

test-watch:
	@./node_modules/.bin/mocha --ui bdd -R list -w spec/javascripts/*.spec.js spec/javascripts/**/*.spec.js

coverage:
	jscoverage --no-highlight lib lib-cov
	CHUCK_COV=1 ./node_modules/.bin/mocha --ui bdd -R html-cov spec/javascripts/*.spec.js spec/javascripts/**/*.spec.js > coverage.html
	rm -rf lib-cov

.PHONY: build clean watch test test-watch coverage
