.PHONY: help lint template install upgrade uninstall test package clean

CHART_DIR := renovate-dashboard
RELEASE_NAME := renovate-dashboard
NAMESPACE := renovate-dashboard
VALUES_FILE := values.yaml

help: ## Display this help message
	@echo "RenovateBot Dashboard Helm Chart - Makefile Commands"
	@echo "=================================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

lint: ## Lint the Helm chart
	@echo "Linting Helm chart..."
	helm lint $(CHART_DIR) -f $(CHART_DIR)/$(VALUES_FILE)

template: ## Generate Kubernetes manifests from the chart
	@echo "Generating Kubernetes manifests..."
	helm template $(RELEASE_NAME) $(CHART_DIR) -f $(CHART_DIR)/$(VALUES_FILE)

template-file: ## Generate Kubernetes manifests and save to file
	@echo "Generating Kubernetes manifests to manifests.yaml..."
	helm template $(RELEASE_NAME) $(CHART_DIR) -f $(CHART_DIR)/$(VALUES_FILE) > manifests.yaml
	@echo "Manifests saved to manifests.yaml"

dry-run: ## Perform a dry-run installation
	@echo "Performing dry-run installation..."
	helm install $(RELEASE_NAME) $(CHART_DIR) \
		-f $(CHART_DIR)/$(VALUES_FILE) \
		--namespace $(NAMESPACE) \
		--dry-run --debug

install: ## Install the Helm chart
	@echo "Installing Helm chart..."
	helm install $(RELEASE_NAME) $(CHART_DIR) \
		-f $(CHART_DIR)/$(VALUES_FILE) \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--timeout 10m \
		--wait

install-dev: ## Install with development values
	@echo "Installing Helm chart with development values..."
	helm install $(RELEASE_NAME) $(CHART_DIR) \
		-f $(CHART_DIR)/values-dev.yaml \
		--namespace $(NAMESPACE)-dev \
		--create-namespace \
		--timeout 10m \
		--wait

install-prod: ## Install with production values
	@echo "Installing Helm chart with production values..."
	helm install $(RELEASE_NAME) $(CHART_DIR) \
		-f $(CHART_DIR)/values-production.yaml \
		--namespace $(NAMESPACE) \
		--create-namespace \
		--timeout 10m \
		--wait

upgrade: ## Upgrade the Helm release
	@echo "Upgrading Helm release..."
	helm upgrade $(RELEASE_NAME) $(CHART_DIR) \
		-f $(CHART_DIR)/$(VALUES_FILE) \
		--namespace $(NAMESPACE) \
		--timeout 10m \
		--wait

upgrade-dev: ## Upgrade with development values
	@echo "Upgrading Helm release with development values..."
	helm upgrade $(RELEASE_NAME) $(CHART_DIR) \
		-f $(CHART_DIR)/values-dev.yaml \
		--namespace $(NAMESPACE)-dev \
		--timeout 10m \
		--wait

upgrade-prod: ## Upgrade with production values
	@echo "Upgrading Helm release with production values..."
	helm upgrade $(RELEASE_NAME) $(CHART_DIR) \
		-f $(CHART_DIR)/values-production.yaml \
		--namespace $(NAMESPACE) \
		--timeout 10m \
		--wait

uninstall: ## Uninstall the Helm release
	@echo "Uninstalling Helm release..."
	helm uninstall $(RELEASE_NAME) --namespace $(NAMESPACE)

uninstall-dev: ## Uninstall development release
	@echo "Uninstalling development Helm release..."
	helm uninstall $(RELEASE_NAME) --namespace $(NAMESPACE)-dev

uninstall-all: ## Uninstall and delete persistent data
	@echo "Uninstalling Helm release and deleting PVCs..."
	helm uninstall $(RELEASE_NAME) --namespace $(NAMESPACE)
	kubectl delete pvc -l app.kubernetes.io/instance=$(RELEASE_NAME) -n $(NAMESPACE)

status: ## Show the status of the Helm release
	@echo "Helm release status:"
	helm status $(RELEASE_NAME) --namespace $(NAMESPACE)

list: ## List all Helm releases in the namespace
	@echo "Helm releases in namespace $(NAMESPACE):"
	helm list --namespace $(NAMESPACE)

history: ## Show release history
	@echo "Release history:"
	helm history $(RELEASE_NAME) --namespace $(NAMESPACE)

rollback: ## Rollback to the previous release
	@echo "Rolling back to previous release..."
	helm rollback $(RELEASE_NAME) --namespace $(NAMESPACE)

get-values: ## Get the values of the current release
	@echo "Current release values:"
	helm get values $(RELEASE_NAME) --namespace $(NAMESPACE)

get-manifest: ## Get the manifest of the current release
	@echo "Current release manifest:"
	helm get manifest $(RELEASE_NAME) --namespace $(NAMESPACE)

test: ## Run Helm tests
	@echo "Running Helm tests..."
	helm test $(RELEASE_NAME) --namespace $(NAMESPACE)

package: ## Package the Helm chart
	@echo "Packaging Helm chart..."
	helm package $(CHART_DIR)
	@echo "Chart packaged successfully"

package-sign: ## Package and sign the Helm chart
	@echo "Packaging and signing Helm chart..."
	helm package $(CHART_DIR) --sign --key renovate-dashboard --keyring ~/.gnupg/secring.gpg
	@echo "Chart packaged and signed successfully"

index: ## Create Helm repository index
	@echo "Creating Helm repository index..."
	helm repo index . --url https://charts.example.com
	@echo "Index created successfully"

verify: ## Verify the packaged chart
	@echo "Verifying packaged chart..."
	helm verify $(CHART_DIR)-*.tgz

pods: ## Show all pods in the namespace
	@echo "Pods in namespace $(NAMESPACE):"
	kubectl get pods -n $(NAMESPACE) -l app.kubernetes.io/instance=$(RELEASE_NAME)

services: ## Show all services in the namespace
	@echo "Services in namespace $(NAMESPACE):"
	kubectl get svc -n $(NAMESPACE) -l app.kubernetes.io/instance=$(RELEASE_NAME)

ingress: ## Show ingress resources
	@echo "Ingress in namespace $(NAMESPACE):"
	kubectl get ingress -n $(NAMESPACE) -l app.kubernetes.io/instance=$(RELEASE_NAME)

pvc: ## Show persistent volume claims
	@echo "PVCs in namespace $(NAMESPACE):"
	kubectl get pvc -n $(NAMESPACE) -l app.kubernetes.io/instance=$(RELEASE_NAME)

logs-backend: ## Show backend logs
	@echo "Backend logs:"
	kubectl logs -n $(NAMESPACE) -l app.kubernetes.io/component=backend --tail=100 -f

logs-frontend: ## Show frontend logs
	@echo "Frontend logs:"
	kubectl logs -n $(NAMESPACE) -l app.kubernetes.io/component=frontend --tail=100 -f

logs-migration: ## Show migration job logs
	@echo "Migration logs:"
	kubectl logs -n $(NAMESPACE) -l app.kubernetes.io/component=migration --tail=100

port-forward-frontend: ## Port-forward to frontend service
	@echo "Port-forwarding to frontend (http://localhost:8080)..."
	kubectl port-forward -n $(NAMESPACE) svc/$(RELEASE_NAME)-frontend 8080:8080

port-forward-backend: ## Port-forward to backend service
	@echo "Port-forwarding to backend (http://localhost:3001)..."
	kubectl port-forward -n $(NAMESPACE) svc/$(RELEASE_NAME)-backend 3001:3001

port-forward-postgres: ## Port-forward to PostgreSQL
	@echo "Port-forwarding to PostgreSQL (localhost:5432)..."
	kubectl port-forward -n $(NAMESPACE) svc/$(RELEASE_NAME)-postgresql 5432:5432

port-forward-redis: ## Port-forward to Redis
	@echo "Port-forwarding to Redis (localhost:6379)..."
	kubectl port-forward -n $(NAMESPACE) svc/$(RELEASE_NAME)-redis 6379:6379

describe-backend: ## Describe backend pods
	@echo "Backend pod details:"
	kubectl describe pods -n $(NAMESPACE) -l app.kubernetes.io/component=backend

describe-frontend: ## Describe frontend pods
	@echo "Frontend pod details:"
	kubectl describe pods -n $(NAMESPACE) -l app.kubernetes.io/component=frontend

events: ## Show recent events in the namespace
	@echo "Recent events in namespace $(NAMESPACE):"
	kubectl get events -n $(NAMESPACE) --sort-by='.lastTimestamp'

clean: ## Clean up generated files
	@echo "Cleaning up generated files..."
	rm -f $(CHART_DIR)-*.tgz
	rm -f $(CHART_DIR)-*.tgz.prov
	rm -f manifests.yaml
	rm -f index.yaml
	@echo "Cleanup complete"

validate-schema: ## Validate values against schema (requires helm plugin)
	@echo "Validating values against schema..."
	@if command -v helm-schema 2> /dev/null; then \
		helm schema validate $(CHART_DIR) -f $(CHART_DIR)/$(VALUES_FILE); \
	else \
		echo "helm-schema plugin not installed. Install with: helm plugin install https://github.com/losisin/helm-values-schema-json"; \
	fi

docs: ## Generate documentation from schema
	@echo "Generating documentation..."
	@echo "See README.md, INSTALL.md, and values.yaml for documentation"

all: lint template package ## Run lint, template, and package

ci-install: lint template install ## CI pipeline: lint, template, and install

ci-upgrade: lint template upgrade ## CI pipeline: lint, template, and upgrade

.DEFAULT_GOAL := help

