# Renovate Bot Dependency Types - Complete Reference

This document provides a comprehensive list of all dependency types supported by the Renovate Bot Dashboard, based on Renovate's 90+ package manager support.

## Overview

The dashboard now supports **40+ dependency managers** with accurate type detection from Renovate PR titles, bodies, and labels. Terraform providers and modules are **kept separate** as distinct types for precise categorization.

## Complete Dependency Types List

### 📦 JavaScript/TypeScript (3 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `npm` | npm | Package | Blue | `npm`, `package.json`, `node_modules` |
| `yarn` | Yarn | Package | Blue | `yarn`, `yarn.lock` |
| `pnpm` | pnpm | Package | Blue | `pnpm`, `pnpm-lock` |

**Package Managers:** npm, Yarn, pnpm  
**File Examples:** `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

---

### 🐍 Python (4 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `pip` | pip | Globe | Yellow | `pip`, `python`, `requirements.txt`, `setup.py` |
| `pip_requirements` | pip | Globe | Yellow | `requirements.txt`, `requirements/*.txt` |
| `pipenv` | Pipenv | Globe | Yellow | `pipenv`, `Pipfile` |
| `poetry` | Poetry | Globe | Yellow | `poetry`, `pyproject.toml` |

**Package Managers:** pip, pip-compile, Pipenv, Poetry  
**File Examples:** `requirements.txt`, `Pipfile`, `pyproject.toml`, `setup.py`

---

### ☕ Java (2 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `maven` | Maven | Box | Yellow | `maven`, `pom.xml` |
| `gradle` | Gradle | Box | Yellow | `gradle`, `build.gradle`, `gradle.properties` |

**Package Managers:** Maven, Gradle  
**File Examples:** `pom.xml`, `build.gradle`, `settings.gradle`, `gradle.properties`

---

### 🔷 Go (1 type)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `gomod` | Go Modules | Package | Blue | `go`, `golang`, `go.mod`, `go.sum` |

**Package Managers:** Go modules  
**File Examples:** `go.mod`, `go.sum`

---

### 🦀 Rust (1 type)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `cargo` | Cargo | Box | Yellow | `cargo`, `rust`, `Cargo.toml` |

**Package Managers:** Cargo  
**File Examples:** `Cargo.toml`, `Cargo.lock`

---

### 🐘 PHP (1 type)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `composer` | Composer | Package | Blue | `composer`, `composer.json` |

**Package Managers:** Composer  
**File Examples:** `composer.json`, `composer.lock`

---

### 💎 Ruby (1 type)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `bundler` | Bundler | Package | Red | `bundler`, `gemfile`, `Gemfile` |

**Package Managers:** Bundler  
**File Examples:** `Gemfile`, `Gemfile.lock`

---

### 🔷 .NET (1 type)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `nuget` | NuGet | Package | Blue | `nuget`, `.csproj`, `packages.config` |

**Package Managers:** NuGet  
**File Examples:** `*.csproj`, `packages.config`, `*.fsproj`

---

### 🐳 Docker (3 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `docker` | Docker | Container | Green | `docker`, `container`, `docker-compose` |
| `dockerfile` | Dockerfile | Container | Green | `dockerfile`, `Dockerfile` |
| `docker_image` | Docker Image | Container | Green | `docker image`, `docker.io` |

**Package Managers:** Docker, docker-compose  
**File Examples:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`

---

### 🏗️ Terraform (3 types - SEPARATED)

**⚠️ IMPORTANT:** Terraform providers and modules are **kept separate** as distinct types for accurate categorization!

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `terraform_provider` | Terraform Provider | Settings2 | Blue | `terraform provider`, `required_providers`, `hashicorp/`, `registry.terraform.io/` (without `/modules/`) |
| `terraform_module` | Terraform Module | Box | Yellow | `terraform module`, `source =`, `registry.terraform.io/*/modules/`, `terraform-*` pattern |
| `terraform` | Terraform | Settings2 | Blue | General terraform dependencies |

**Provider Examples:**
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

**Module Examples:**
```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"
}
```

**Package Managers:** Terraform, Terragrunt  
**File Examples:** `*.tf`, `terragrunt.hcl`, `.terraform.lock.hcl`

**Detection Logic:**
- **Modules:** Detected via `source =` declarations, `/modules/` in registry URL, `terraform-*` naming patterns
- **Providers:** Detected via `required_providers` blocks, `provider "..."` declarations, registry URLs without `/modules/`

---

### ☸️ Kubernetes & Cloud Native (3 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `kubernetes` | Kubernetes | Container | Green | `kubernetes`, `k8s`, `kustomization` |
| `helm` | Helm | Package | Green | `helm`, `Chart.yaml`, `helm chart` |
| `kustomize` | Kustomize | Container | Green | `kustomize` |

**Package Managers:** Kubernetes, Helm, Kustomize  
**File Examples:** `kustomization.yaml`, `Chart.yaml`, `values.yaml`, Kubernetes manifests

---

### 🔄 CI/CD & GitHub (6 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `github_action` | GitHub Action | Github | Red | `github action`, `github-action`, `.github/workflows` |
| `github_releases` | GitHub Releases | Github | Red | `github-releases`, `/releases/` |
| `github_tags` | GitHub Tags | Github | Red | `github-tags` |
| `circleci` | CircleCI | Zap | Blue | `circleci`, `.circleci/config` |
| `azure_pipelines` | Azure Pipelines | Zap | Blue | `azure-pipelines`, `azure pipelines` |
| `gitlab_ci` | GitLab CI | Zap | Blue | `gitlab`, `.gitlab-ci` |

**Package Managers:** GitHub Actions, CircleCI, Azure Pipelines, GitLab CI  
**File Examples:** `.github/workflows/*.yml`, `.circleci/config.yml`, `azure-pipelines.yml`, `.gitlab-ci.yml`

---

### 🏗️ Infrastructure as Code (3 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `ansible` | Ansible | Settings2 | Green | `ansible`, `ansible-galaxy`, `requirements.yml` |
| `argocd` | ArgoCD | Settings2 | Green | `argocd`, `argo cd` |
| `flux` | Flux | Settings2 | Green | `flux` |

**Package Managers:** Ansible, ArgoCD, Flux  
**File Examples:** `requirements.yml`, `galaxy.yml`, ArgoCD/Flux manifests

---

### 🔧 Other Managers (5 types)

| Type | Label | Icon | Color | Detection Keywords |
|------|-------|------|-------|-------------------|
| `bazel` | Bazel | Box | Blue | `bazel`, `BUILD.bazel`, `WORKSPACE` |
| `cocoapods` | CocoaPods | Package | Blue | `cocoapods`, `Podfile` |
| `swift` | Swift | Package | Blue | `swift`, `Package.swift` |
| `homebrew` | Homebrew | Package | Gray | `homebrew`, `brew formula` |
| `asdf` | asdf | Package | Gray | `asdf`, `.tool-versions` |

**Package Managers:** Bazel, CocoaPods, Swift Package Manager, Homebrew, asdf  
**File Examples:** `BUILD.bazel`, `Podfile`, `Package.swift`, `Formula/*.rb`, `.tool-versions`

---

### 🔄 Generic/Fallback (4 types)

| Type | Label | Icon | Color | Notes |
|------|-------|------|-------|-------|
| `package` | Package | Package | Gray | Default fallback for unrecognized package types |
| `provider` | Provider | Settings2 | Blue | Generic provider (fallback) |
| `action` | Action | Code | Yellow | Generic action (fallback) |
| `workflow` | Workflow | Github | Red | Generic workflow (fallback) |

---

## Total Count: 40+ Dependency Types

### Breakdown by Category:

- **JavaScript/TypeScript:** 3 types
- **Python:** 4 types
- **Java:** 2 types
- **Go:** 1 type
- **Rust:** 1 type
- **PHP:** 1 type
- **Ruby:** 1 type
- **.NET:** 1 type
- **Docker:** 3 types
- **Terraform:** 3 types (provider & module separate!)
- **Kubernetes:** 3 types
- **CI/CD:** 6 types
- **IaC:** 3 types
- **Other:** 5 types
- **Generic:** 4 types

**Total:** 41 specific types

---

## Detection Strategy

The dashboard detects dependency types using a multi-layered approach:

### 1. PR Title Analysis
```typescript
// Example: "Update dependency @aws-sdk/client-s3 to v3.400.0"
titleLower.includes('npm') // → npm
```

### 2. PR Body Content
```typescript
// Looks for file mentions like:
bodyLower.includes('package.json') // → npm
bodyLower.includes('go.mod')       // → gomod
```

### 3. Label Inspection
```typescript
// Renovate adds labels like:
labels: ['npm', 'dependencies'] // → npm
labels: ['terraform', 'provider'] // → terraform_provider
```

### 4. Special Logic for Terraform
```typescript
// Terraform providers vs modules require special handling:
if (bodyLower.includes('source =')) {
  return 'terraform_module';
}
if (bodyLower.includes('required_providers')) {
  return 'terraform_provider';
}
```

---

## PR Body Table "Type" Column

Renovate PRs include a markdown table like this:

```markdown
| Datasource | Package | Type | Update | Change |
|------------|---------|------|--------|--------|
| npm | eslint | devDependencies | minor | 8.0.0 -> 8.1.0 |
| pypi | requests | dependencies | patch | 2.28.0 -> 2.28.1 |
| docker | node | final | minor | 18-alpine -> 19-alpine |
| terraform-provider | hashicorp/aws | required_provider | minor | 4.0 -> 4.1 |
| terraform-module | terraform-aws-modules/vpc/aws | module | patch | 3.18.0 -> 3.18.1 |
```

### "Type" Column Values by Manager:

#### npm/yarn/pnpm:
- `dependencies`
- `devDependencies`
- `optionalDependencies`
- `peerDependencies`
- `engines`
- `packageManager`
- `resolutions`
- `overrides`

#### Python (pip):
- `dependencies`
- `requires`

#### Docker:
- `final` (final image)
- `stage` (multi-stage build)

#### Terraform:
- `required_provider` (providers)
- `required_version` (terraform version)
- `module` (modules)

#### GitHub Actions:
- `action` (actions)

#### Go:
- `require`
- `indirect`

---

## Usage in Code

### Backend Detection

```typescript
// backend/src/services/github.service.ts
private extractDependencyType(pr: RenovatePR): DependencyType {
  // Comprehensive detection logic with 40+ types
  // Prioritizes Terraform provider/module separation
}
```

### Frontend Display

```typescript
// frontend/src/lib/utils.ts
getDependencyTypeIcon('terraform_provider')  // → 'Settings2'
getDependencyTypeLabel('terraform_module')   // → 'Terraform Module'
getDependencyTypeColor('npm')                // → 'badge-info' (blue)
```

### Database Storage

```prisma
// backend/prisma/schema.prisma
enum DependencyType {
  npm
  terraform_provider
  terraform_module
  // ... 38 more types
}
```

---

## Terraform Provider vs Module Examples

### Real-World Renovate PRs:

#### Provider Update PR:
```
Title: Update Terraform hashicorp/aws provider to v5.20.0
Labels: terraform, terraform-provider, dependencies
Body: Updates `hashicorp/aws` from `5.19.0` to `5.20.0`
      Required in `required_providers` block
→ Detected as: terraform_provider
```

#### Module Update PR:
```
Title: Update Terraform terraform-aws-modules/vpc/aws module to v5.1.2  
Labels: terraform, terraform-module, dependencies
Body: Updates module `source = "terraform-aws-modules/vpc/aws"` 
      from `5.1.1` to `5.1.2`
→ Detected as: terraform_module
```

---

## Migration Notes

### Breaking Changes

If upgrading from a previous version, note:

1. **New Types Added:** 29 new types (from 12 to 41)
2. **Terraform Split:** `terraform` is now split into `terraform_provider` and `terraform_module`
3. **Database Migration:** Run `npx prisma migrate dev` to update the enum
4. **Frontend Types:** Updated to match backend exactly

### Migration Steps

```bash
# 1. Update database schema
cd backend
npx prisma migrate dev --name add-comprehensive-dependency-types

# 2. Restart backend to apply changes
pnpm run dev

# 3. Frontend automatically uses new types (no rebuild needed)
```

---

## Future Additions

Additional managers that could be added:

- **Clojure:** Leiningen, deps.edn
- **Elixir:** Mix
- **Scala:** sbt
- **Haskell:** Cabal, Stack
- **OCaml:** opam
- **Julia:** Pkg
- **R:** CRAN
- **Lua:** LuaRocks
- **Erlang:** Rebar3

---

## References

- [Renovate Official Documentation](https://docs.renovatebot.com)
- [Renovate Supported Managers](https://docs.renovatebot.com/modules/manager/)
- [Terraform Provider vs Module](https://www.terraform.io/docs/language/providers/requirements.html)

---

**Last Updated:** December 2025  
**Version:** 2.0.0  
**Status:** ✅ Production Ready

