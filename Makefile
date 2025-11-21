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

.PHONY: prod
prod:
	@npm ci
	@npm run build
	@cd context-assistant && npm ci 
	@echo "deleting _site directory"
	@rm -rf _site
	@cp -r ./context-assistant/dist _site
	@cp -r ./build _site/
	@cp -r ./editor _site/
	@cp -r ./playground _site/
	@cp -r ./manual _site/
	@cp -r ./docs _site/
	@cp -r ./files _site/
	@cp -r ./examples _site/
	@cp -r ./src _site/
	@echo "=== Production build complete! Files are in _site/ ==="
