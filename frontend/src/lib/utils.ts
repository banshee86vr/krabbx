import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
}

export function getUpdateTypeColor(updateType: string | null): string {
  switch (updateType) {
    case 'major':
      return 'badge-danger';
    case 'minor':
      return 'badge-warning';
    case 'patch':
      return 'badge-success';
    case 'digest':
    case 'pin':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

export function getPackageManagerIcon(manager: string): string {
  const icons: Record<string, string> = {
    npm: 'N',
    pip: 'P',
    maven: 'M',
    nuget: 'Nu',
    docker: 'D',
    gomod: 'Go',
    composer: 'C',
    cargo: 'Rs',
    gradle: 'G',
  };
  return icons[manager.toLowerCase()] || manager.charAt(0).toUpperCase();
}

/**
 * Returns badge color class for dependency type
 * Color scheme: info (blue), success (green), warning (yellow), danger (red), neutral (gray)
 */
export function getDependencyTypeColor(dependencyType: string): string {
  switch (dependencyType) {
    // JavaScript/TypeScript - Blue
    case 'npm':
    case 'yarn':
    case 'pnpm':
      return 'badge-info';

    // Python - Yellow
    case 'pip':
    case 'pip_requirements':
    case 'pipenv':
    case 'poetry':
      return 'badge-warning';

    // Java - Orange/Warning
    case 'maven':
    case 'gradle':
      return 'badge-warning';

    // Go - Blue
    case 'gomod':
      return 'badge-info';

    // Rust - Orange
    case 'cargo':
      return 'badge-warning';

    // PHP - Purple (use info)
    case 'composer':
      return 'badge-info';

    // Ruby - Red
    case 'bundler':
      return 'badge-danger';

    // .NET - Blue
    case 'nuget':
      return 'badge-info';

    // Docker - Green
    case 'docker':
    case 'dockerfile':
    case 'docker_image':
      return 'badge-success';

    // Terraform - Purple/Info for provider, Yellow for module
    case 'terraform_provider':
    case 'provider':
      return 'badge-info';
    case 'terraform_module':
      return 'badge-warning';
    case 'terraform':
      return 'badge-info';

    // Kubernetes & Cloud Native - Green
    case 'kubernetes':
    case 'helm':
    case 'kustomize':
      return 'badge-success';

    // CI/CD & GitHub - Red/Danger
    case 'github_action':
    case 'github_releases':
    case 'github_tags':
      return 'badge-danger';
    case 'circleci':
    case 'azure_pipelines':
    case 'gitlab_ci':
      return 'badge-info';

    // Infrastructure as Code - Success
    case 'ansible':
    case 'argocd':
    case 'flux':
      return 'badge-success';

    // Other managers
    case 'bazel':
    case 'cocoapods':
    case 'swift':
      return 'badge-info';
    case 'homebrew':
    case 'asdf':
      return 'badge-neutral';

    // Generic/Fallback
    case 'action':
      return 'badge-warning';
    case 'workflow':
      return 'badge-danger';
    case 'package':
    default:
      return 'badge-neutral';
  }
}

/**
 * Returns human-readable label for dependency type
 */
export function getDependencyTypeLabel(dependencyType: string): string {
  const labels: Record<string, string> = {
    // JavaScript/TypeScript
    npm: 'npm',
    yarn: 'Yarn',
    pnpm: 'pnpm',
    
    // Python
    pip: 'pip',
    pip_requirements: 'pip',
    pipenv: 'Pipenv',
    poetry: 'Poetry',
    
    // Java
    maven: 'Maven',
    gradle: 'Gradle',
    
    // Go
    gomod: 'Go Modules',
    
    // Rust
    cargo: 'Cargo',
    
    // PHP
    composer: 'Composer',
    
    // Ruby
    bundler: 'Bundler',
    
    // .NET
    nuget: 'NuGet',
    
    // Docker
    docker: 'Docker',
    dockerfile: 'Dockerfile',
    docker_image: 'Docker Image',
    
    // Terraform
    terraform_provider: 'Terraform Provider',
    terraform_module: 'Terraform Module',
    terraform: 'Terraform',
    
    // Kubernetes & Cloud Native
    kubernetes: 'Kubernetes',
    helm: 'Helm',
    kustomize: 'Kustomize',
    
    // CI/CD & GitHub
    github_action: 'GitHub Action',
    github_releases: 'GitHub Releases',
    github_tags: 'GitHub Tags',
    circleci: 'CircleCI',
    azure_pipelines: 'Azure Pipelines',
    gitlab_ci: 'GitLab CI',
    
    // Infrastructure as Code
    ansible: 'Ansible',
    argocd: 'ArgoCD',
    flux: 'Flux',
    
    // Other managers
    bazel: 'Bazel',
    cocoapods: 'CocoaPods',
    swift: 'Swift',
    homebrew: 'Homebrew',
    asdf: 'asdf',
    
    // Generic/Fallback
    package: 'Package',
    provider: 'Provider',
    action: 'Action',
    workflow: 'Workflow',
  };
  return labels[dependencyType] || dependencyType;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Returns Lucide icon name for dependency type
 * Icons must be imported in components that use this function
 */
export function getDependencyTypeIcon(dependencyType: string): string {
  switch (dependencyType) {
    // JavaScript/TypeScript
    case 'npm':
    case 'yarn':
    case 'pnpm':
      return 'Package';

    // Python
    case 'pip':
    case 'pip_requirements':
    case 'pipenv':
    case 'poetry':
      return 'Globe';

    // Java
    case 'maven':
    case 'gradle':
      return 'Box';

    // Go
    case 'gomod':
      return 'Package';

    // Rust
    case 'cargo':
      return 'Box';

    // PHP
    case 'composer':
      return 'Package';

    // Ruby
    case 'bundler':
      return 'Package';

    // .NET
    case 'nuget':
      return 'Package';

    // Docker
    case 'docker':
    case 'dockerfile':
    case 'docker_image':
      return 'Container';

    // Terraform - Settings2 for provider, Box for module
    case 'terraform_provider':
    case 'provider':
      return 'Settings2';
    case 'terraform_module':
      return 'Box';
    case 'terraform':
      return 'Settings2';

    // Kubernetes & Cloud Native
    case 'kubernetes':
    case 'kustomize':
      return 'Container';
    case 'helm':
      return 'Package';

    // CI/CD & GitHub
    case 'github_action':
    case 'github_releases':
    case 'github_tags':
      return 'Github';
    case 'circleci':
    case 'azure_pipelines':
    case 'gitlab_ci':
      return 'Zap';

    // Infrastructure as Code
    case 'ansible':
    case 'argocd':
    case 'flux':
      return 'Settings2';

    // Other managers
    case 'bazel':
      return 'Box';
    case 'cocoapods':
    case 'swift':
      return 'Package';
    case 'homebrew':
    case 'asdf':
      return 'Package';

    // Generic/Fallback
    case 'action':
      return 'Code';
    case 'workflow':
      return 'Github';
    case 'package':
    default:
      return 'Package';
  }
}
