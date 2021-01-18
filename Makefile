DIST_NAME = direction

SCRIPT_FILES = \
	src/$(DIST_NAME).ts \
	src/definition.ts \
	src/DirectionCaret.ts \
	src/DirectionNode.ts \
	src/Exception.ts \
	src/LayoutState.ts \
	src/NodePalette.ts \
	src/PreferredAxis.ts

all: build lint test coverage esdoc

build: dist/$(DIST_NAME).js
.PHONY: build

demo: dist/$(DIST_NAME).js
	npm run demo
.PHONY: demo

check:
	npm run test
.PHONY: check

test: check
.PHONY: test

coverage:
	npm run coverage
.PHONY: coverage

prettier:
	npx prettier --write src test demo
.PHONY: prettier

lint:
	npx eslint --fix $(SCRIPT_FILES)
.PHONY: lint

esdoc:
	npx esdoc
.PHONY: esdoc

doc: esdoc
.PHONY: doc

dist/$(DIST_NAME).js: package.json package-lock.json $(SCRIPT_FILES)
	npm run build
	mv -v dist/src/* dist/

clean:
	rm -rf dist .nyc_output
.PHONY: clean
