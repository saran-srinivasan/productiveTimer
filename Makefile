# ==============================================================================
# ProductiveTimer - Project Makefile
# ==============================================================================
# This Makefile provides quick shortcuts for managing the web frontend,
# Rust backend, Expo mobile app, Docker containers, and project builds.
# ==============================================================================

.DEFAULT_GOAL := help

.PHONY: help setup install install-mobile install-all \
	dev backend dev-all preview \
	mobile mobile-android mobile-ios mobile-web mobile-lint \
	build backend-build backend-release build-all \
	check test \
	docker-build docker-up docker-down docker-logs docker-restart \
	clean clean-all

# ------------------------------------------------------------------------------
# Help & Information
# ------------------------------------------------------------------------------
help:
	@node -e "console.log('\n\x1b[1;36mProductiveTimer - Developer Commands\x1b[0m\n' + \
		'======================================================\n\n' + \
		'\x1b[1;33mSetup & Dependencies:\x1b[0m\n' + \
		'  make setup           Ensure .env and directories exist, install web deps\n' + \
		'  make install         Install web frontend dependencies (npm install)\n' + \
		'  make install-mobile  Install Expo mobile dependencies\n' + \
		'  make install-all     Install web + mobile deps and verify Rust backend\n\n' + \
		'\x1b[1;33mDevelopment:\x1b[0m\n' + \
		'  make dev             Start Vite web dev server (http://127.0.0.1:5173)\n' + \
		'  make backend         Run Rust backend server (http://127.0.0.1:3001)\n' + \
		'  make dev-all         Run Rust backend & Vite web concurrently\n' + \
		'  make preview         Preview production web build locally\n\n' + \
		'\x1b[1;33mMobile (Expo / React Native):\x1b[0m\n' + \
		'  make mobile          Start Expo development bundler\n' + \
		'  make mobile-android  Start Expo targeting Android emulator/device\n' + \
		'  make mobile-ios      Start Expo targeting iOS simulator\n' + \
		'  make mobile-web      Start Expo for Web preview\n' + \
		'  make mobile-lint     Run ESLint on mobile codebase\n\n' + \
		'\x1b[1;33mBuild & Production:\x1b[0m\n' + \
		'  make build           Build web frontend (tsc -b && vite build)\n' + \
		'  make backend-build   Build Rust backend (debug mode)\n' + \
		'  make backend-release Build Rust backend with release optimizations\n' + \
		'  make build-all       Build web frontend + optimized backend\n\n' + \
		'\x1b[1;33mQuality & Testing:\x1b[0m\n' + \
		'  make check           Type-check frontend & cargo check backend\n' + \
		'  make test            Run Rust backend test suite\n\n' + \
		'\x1b[1;33mDocker Containers:\x1b[0m\n' + \
		'  make docker-build    Build standalone Docker production image\n' + \
		'  make docker-up       Start container stack via Docker Compose\n' + \
		'  make docker-down     Stop and tear down Docker Compose stack\n' + \
		'  make docker-logs     Follow live Docker Compose logs\n' + \
		'  make docker-restart  Restart running Docker Compose stack\n\n' + \
		'\x1b[1;33mClean & Reset:\x1b[0m\n' + \
		'  make clean           Clean dist/, backend/target/, .expo/ cache\n' + \
		'  make clean-all       Remove build outputs AND node_modules\n')"

# ------------------------------------------------------------------------------
# Setup & Dependencies
# ------------------------------------------------------------------------------
setup:
	@node -e "if (!fs.existsSync('.env') && fs.existsSync('.env.example')) { fs.copyFileSync('.env.example', '.env'); console.log('✓ Created .env from .env.example'); }"
	@node -e "if (!fs.existsSync('data')) { fs.mkdirSync('data', { recursive: true }); console.log('✓ Created data/ directory'); }"
	npm install

install:
	npm install

install-mobile:
	npm --prefix mobile install

install-all: install install-mobile
	cargo check --manifest-path backend/Cargo.toml

# ------------------------------------------------------------------------------
# Development
# ------------------------------------------------------------------------------
dev:
	npm run dev

backend:
	cargo run --manifest-path backend/Cargo.toml

dev-all:
	npx --yes concurrently -k -n "backend,frontend" -c "cyan,magenta" "cargo run --manifest-path backend/Cargo.toml" "npm run dev"

preview:
	npm run preview

# ------------------------------------------------------------------------------
# Mobile (Expo / React Native)
# ------------------------------------------------------------------------------
mobile:
	npm --prefix mobile start

mobile-android:
	npm --prefix mobile run android

mobile-ios:
	npm --prefix mobile run ios

mobile-web:
	npm --prefix mobile run web

mobile-lint:
	npm --prefix mobile run lint

# ------------------------------------------------------------------------------
# Build & Production
# ------------------------------------------------------------------------------
build:
	npm run build

backend-build:
	cargo build --manifest-path backend/Cargo.toml

backend-release:
	cargo build --release --manifest-path backend/Cargo.toml

build-all: build backend-release

# ------------------------------------------------------------------------------
# Quality & Testing
# ------------------------------------------------------------------------------
check:
	npm run build
	cargo check --manifest-path backend/Cargo.toml

test:
	cargo test --manifest-path backend/Cargo.toml

# ------------------------------------------------------------------------------
# Docker Operations
# ------------------------------------------------------------------------------
docker-build:
	docker build -t productive-timer .

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-restart:
	docker compose restart

# ------------------------------------------------------------------------------
# Clean & Reset
# ------------------------------------------------------------------------------
clean:
	@node -e "['dist', 'backend/target', 'mobile/.expo', 'tsconfig.tsbuildinfo'].forEach(p => { if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); console.log('✓ Removed ' + p); } })"

clean-all: clean
	@node -e "['node_modules', 'mobile/node_modules'].forEach(p => { if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); console.log('✓ Removed ' + p); } })"
