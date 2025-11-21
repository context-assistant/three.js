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
	@echo "deleting _site directory"
	@ rm -rf _site
	@echo "=== Installing root dependencies ==="
	npm ci
	@echo "=== Installing context-assistant dependencies ==="
	cd context-assistant && npm ci
	@echo "=== Building three.js production ==="
	npm run build
	@echo "=== Building context-assistant production ==="
	cd context-assistant && npm run build
	@echo "=== Copying three.js build files to _site/ ==="
	mv ./context-assistant/dist _site
	cp -r ./build _site/
	cp -r ./editor _site/
	cp -r ./playground _site/
	cp -r ./manual _site/
	cp -r ./docs _site/
	cp -r ./files _site/
	cp -r ./examples _site/
	cp -r ./src _site/
	@echo "=== Production build complete! Files are in _site/ ==="
	@echo "Note: To test locally, you may want to serve _site/ with a static file server"
	@npx http-server _site
	@rm -rf _site