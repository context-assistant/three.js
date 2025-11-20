.PHONY: install
install:
	cd context-assistant && npm install

.PHONY: dev
dev:
	cd context-assistant && npm run dev

.PHONY: build
build:
	cd context-assistant && npm run build

.PHONY: test
test:
	cd context-assistant && npm run test

.PHONY: lint
lint:
	cd context-assistant && npm run lint

.PHONY: test-coverage
test-coverage:
	cd context-assistant && npm run test:coverage