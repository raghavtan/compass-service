APP_NAME := compass-service
DOCKER_IMAGE := $(APP_NAME)
DOCKER_TAG := latest
PORT := 3000

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
PURPLE := \033[0;35m
CYAN := \033[0;36m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# =============================================================================
# Help
# =============================================================================
.PHONY: help
help: ## Show this help message
	@echo "$(CYAN)$(APP_NAME) - Available commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(BLUE)%-20s$(NC) %s\n", $1, $2}'
	@echo ""

# =============================================================================
# Setup and Installation
# =============================================================================
.PHONY: install
install: ## Install dependencies
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	npm ci
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

.PHONY: install-dev
install-dev: ## Install all dependencies including dev
	@echo "$(YELLOW)Installing all dependencies...$(NC)"
	npm install
	@echo "$(GREEN)All dependencies installed successfully!$(NC)"

.PHONY: clean
clean: ## Clean node_modules and build artifacts
	@echo "$(YELLOW)Cleaning up...$(NC)"
	rm -rf node_modules
	rm -rf dist
	rm -rf coverage
	rm -rf .nyc_output
	@echo "$(GREEN)Cleanup completed!$(NC)"

.PHONY: setup
setup: clean install ## Complete setup from scratch
	@echo "$(GREEN)Setup completed successfully!$(NC)"

# =============================================================================
# Development
# =============================================================================
.PHONY: dev
dev: ## Start development server
	@echo "$(YELLOW)Starting development server...$(NC)"
	npm run start:dev

.PHONY: debug
debug: ## Start development server in debug mode
	@echo "$(YELLOW)Starting development server in debug mode...$(NC)"
	npm run start:debug

.PHONY: watch
watch: ## Start development server with file watching
	@echo "$(YELLOW)Starting development server with file watching...$(NC)"
	npm run start:dev

# =============================================================================
# Building
# =============================================================================
.PHONY: build
build: ## Build the application
	@echo "$(YELLOW)Building application...$(NC)"
	npm run build
	@echo "$(GREEN)Build completed successfully!$(NC)"

.PHONY: build-prod
build-prod: clean install build ## Production build from scratch
	@echo "$(GREEN)Production build completed successfully!$(NC)"

# =============================================================================
# Testing
# =============================================================================
.PHONY: test
test: ## Run unit tests
	@echo "$(YELLOW)Running unit tests...$(NC)"
	npm test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo "$(YELLOW)Running tests in watch mode...$(NC)"
	npm run test:watch

.PHONY: test-cov
test-cov: ## Run tests with coverage
	@echo "$(YELLOW)Running tests with coverage...$(NC)"
	npm run test:cov

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(YELLOW)Running e2e tests...$(NC)"
	npm run test:e2e

.PHONY: test-all
test-all: test test-e2e ## Run all tests
	@echo "$(GREEN)All tests completed!$(NC)"

# =============================================================================
# Code Quality
# =============================================================================
.PHONY: lint
lint: ## Run ESLint
	@echo "$(YELLOW)Running ESLint...$(NC)"
	npm run lint

.PHONY: lint-fix
lint-fix: ## Run ESLint with auto-fix
	@echo "$(YELLOW)Running ESLint with auto-fix...$(NC)"
	npm run lint -- --fix

.PHONY: format
format: ## Format code with Prettier
	@echo "$(YELLOW)Formatting code...$(NC)"
	npm run format

.PHONY: format-check
format-check: ## Check code formatting
	@echo "$(YELLOW)Checking code formatting...$(NC)"
	npm run format -- --check

.PHONY: quality
quality: lint format-check test-cov ## Run all quality checks
	@echo "$(GREEN)All quality checks passed!$(NC)"

# =============================================================================
# Docker Development
# =============================================================================

.PHONY: docker-build
docker-build: ## Build production Docker image
	@echo "$(YELLOW)Building Docker production image...$(NC)"
	docker build .
	@echo "$(GREEN)Docker production image built successfully!$(NC)"
