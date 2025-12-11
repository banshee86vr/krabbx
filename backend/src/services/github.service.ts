import { Octokit } from '@octokit/rest';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { DependencyType, UpdateType } from '../storage/types.js';

const log = logger.child('GitHubService');

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string | undefined;
  html_url: string;
  archived: boolean | undefined;
  private: boolean;
}

interface RenovateConfig {
  path: string;
  content: string;
}

interface RenovatePR {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  labels: { name: string }[];
}

interface DependencyFromPR {
  packageName: string;
  packageManager: string;
  dependencyType: import('../storage/types').DependencyType;
  currentVersion: string;
  newVersion: string;
  updateType: string;
  prNumber: number;
  prUrl: string;
}

export class GitHubService {
  private octokit: Octokit;
  private org: string;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.octokit = new Octokit({ auth: config.github.token });
    this.org = config.github.org;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getOrganizationRepositories(): Promise<GitHubRepository[]> {
    const cacheKey = `repos:${this.org}`;
    const cached = this.getCached<GitHubRepository[]>(cacheKey);
    if (cached) return cached;

    const repos: GitHubRepository[] = [];
    let page = 1;
    const perPage = 100;

    // Try listForOrg first (requires org admin read permission)
    try {
      while (true) {
        const response = await this.octokit.rest.repos.listForOrg({
          org: this.org,
          type: 'all',
          per_page: perPage,
          page,
        });

        repos.push(...response.data.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          default_branch: repo.default_branch,
          html_url: repo.html_url,
          archived: repo.archived,
          private: repo.private,
        })));

        if (response.data.length < perPage) break;
        page++;
      }
      console.log(`[GitHub] listForOrg returned ${repos.length} repositories`);
    } catch (error) {
      console.log(`[GitHub] listForOrg failed:`, error);
    }

    // If listForOrg returned no repos, try listing repos accessible to the token
    if (repos.length === 0) {
      console.log(`[GitHub] Trying listForAuthenticatedUser fallback...`);
      page = 1;

      while (true) {
        const response = await this.octokit.rest.repos.listForAuthenticatedUser({
          per_page: perPage,
          page,
        });

        const owners = [...new Set(response.data.map(r => r.owner?.login))];
        console.log(`[GitHub] listForAuthenticatedUser page ${page}: ${response.data.length} repos, owners: ${owners.join(', ')}, looking for: ${this.org}`);

        const orgRepos = response.data
          .filter(repo => repo.owner?.login?.toLowerCase() === this.org.toLowerCase())
          .map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            default_branch: repo.default_branch,
            html_url: repo.html_url,
            archived: repo.archived,
            private: repo.private,
          }));

        repos.push(...orgRepos);

        if (response.data.length < perPage) break;
        page++;
      }
    }

    console.log(`[GitHub] Found ${repos.length} repositories for org ${this.org}`);
    this.setCache(cacheKey, repos);
    return repos;
  }

  async checkRenovateConfig(repoName: string): Promise<RenovateConfig | null> {
    const possiblePaths = [
      'renovate.json',
      'renovate.json5',
      '.renovaterc',
      '.renovaterc.json',
      '.github/renovate.json',
      '.github/renovate.json5',
    ];

    for (const path of possiblePaths) {
      try {
        const response = await this.octokit.rest.repos.getContent({
          owner: this.org,
          repo: repoName,
          path,
        });

        if ('content' in response.data) {
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          return { path, content };
        }
      } catch {
        // File not found, continue to next path
      }
    }

    // Check package.json for renovate config
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.org,
        repo: repoName,
        path: 'package.json',
      });

      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        const packageJson = JSON.parse(content);
        if (packageJson.renovate) {
          return { path: 'package.json', content: JSON.stringify(packageJson.renovate) };
        }
      }
    } catch {
      // No package.json or no renovate config
    }

    return null;
  }

  async checkRenovateWorkflow(repoName: string): Promise<boolean> {
    try {
      // Check for workflows that call the shared renovate workflow
      const response = await this.octokit.rest.repos.getContent({
        owner: this.org,
        repo: repoName,
        path: '.github/workflows',
      });

      if (!Array.isArray(response.data)) {
        return false;
      }

      // Check each workflow file for reference to the shared renovate workflow
      for (const file of response.data) {
        if (file.type === 'file' && (file.name?.endsWith('.yml') || file.name?.endsWith('.yaml'))) {
          try {
            const workflowResponse = await this.octokit.rest.repos.getContent({
              owner: this.org,
              repo: repoName,
              path: `.github/workflows/${file.name}`,
            });

            if ('content' in workflowResponse.data) {
              const content = Buffer.from(workflowResponse.data.content, 'base64').toString('utf-8');
              // Look for reference to the shared renovate workflow
              if (content.includes('prom-candp/platform-gh-workflows/.github/workflows/bot-renovate.yaml')) {
                console.log(`[GitHub] Found renovate workflow in ${repoName}: ${file.name}`);
                return true;
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }

      return false;
    } catch {
      // No workflows directory or can't read it
      return false;
    }
  }

  async getRenovatePRs(repoName: string): Promise<RenovatePR[]> {
    const cacheKey = `prs:${this.org}:${repoName}`;
    const cached = this.getCached<RenovatePR[]>(cacheKey);
    if (cached) return cached;

    try {
      const renovatePRs: RenovatePR[] = [];
      let page = 1;
      const perPage = 100;

      // Paginate through open PRs to find dependencies from renovate bot
      while (true) {
        const response = await this.octokit.rest.pulls.list({
          owner: this.org,
          repo: repoName,
          state: 'open',
          per_page: perPage,
          page,
        });

        if (response.data.length === 0) break;

        const pageRenovatePRs = response.data
          .filter(pr => {
            // Match any renovate bot (e.g., 'renovate[bot]', 'candp-renovatebot[bot]', 'my-renovate-bot[bot]')
            const botLogin = pr.user?.login?.toLowerCase() || '';
            return botLogin.includes('renovate') && botLogin.includes('[bot]');
          })
          .map(pr => ({
            number: pr.number,
            title: pr.title,
            body: pr.body || null,
            html_url: pr.html_url,
            state: pr.state,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            labels: pr.labels.map(l => ({ name: l.name || '' })),
          }));

        renovatePRs.push(...pageRenovatePRs);

        if (response.data.length < perPage) break;
        page++;
      }

      console.log(`[GitHub Service] Retrieved ${renovatePRs.length} Renovate PRs for ${repoName}`);
      this.setCache(cacheKey, renovatePRs);
      return renovatePRs;
    } catch {
      return [];
    }
  }

  private compareVersions(currentVersion: string, newVersion: string): string {
    // Parse semantic versions, handling common prefixes and constraints
    const parseVersion = (v: string) => {
      // First, strip everything before the first digit (e.g., "aks-file-share-v" from "aks-file-share-v0.1.0")
      let versionPart = v.replace(/^[^\d]+/, '');

      // Remove common version constraints operators like ^, ~, >, <, =, ~> but keep the version numbers
      // Match: ~>, >=, <=, ~, ^, >, <, = followed by optional space
      versionPart = versionPart.replace(/^[~><=^]*\s*/, '');

      // Split by . - space or combinations to extract major.minor.patch
      const parts = versionPart.split(/[.\s-]+/).filter(p => /^\d+$/.test(p));

      return {
        major: parseInt(parts[0] || '0', 10) || 0,
        minor: parseInt(parts[1] || '0', 10) || 0,
        patch: parseInt(parts[2] || '0', 10) || 0,
      };
    };

    const current = parseVersion(currentVersion);
    const next = parseVersion(newVersion);

    // Compare versions - check major first, then minor, then patch
    if (next.major > current.major) {
      return 'major';
    } else if (next.major === current.major && next.minor > current.minor) {
      return 'minor';
    } else if (next.major === current.major && next.minor === current.minor && next.patch > current.patch) {
      return 'patch';
    }

    // If versions are the same or we can't parse them, it might be a digest or pin
    return 'patch';
  }

  private extractVersionsFromPRBody(pr: RenovatePR, packageName: string): { current: string; new: string } {
    const unknown = { current: 'unknown', new: 'unknown' };
    if (!pr.body) return unknown;

    const escapedPackageName = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Pattern 1: Markdown table format (primary - used in most Renovate PRs)
    // Matches: `workflows-v2.10.4` -> `workflows-v2.11.2`
    const tablePattern = /\`([^\`]+)\`\s*->\s*\`([^\`]+)\`/;
    const tableMatch = pr.body.match(tablePattern);
    if (tableMatch?.[1] && tableMatch?.[2]) {
      return {
        current: tableMatch[1].trim(),
        new: tableMatch[2].trim(),
      };
    }

    // Pattern 2: Bullet list format with backticks and "to"
    // Matches: - `package` from `v1.0.0` to `v2.0.0`
    const bulletPattern1 = new RegExp(`-\\s*\\\`${escapedPackageName}\\\`\\s+from\\s+\\\`([^\\\`]+)\\\`\\s+to\\s+\\\`([^\\\`]+)\\\``, 'i');
    const bulletMatch1 = pr.body.match(bulletPattern1);
    if (bulletMatch1?.[1] && bulletMatch1?.[2]) {
      return {
        current: bulletMatch1[1].trim(),
        new: bulletMatch1[2].trim(),
      };
    }

    // Pattern 3: Bullet list format with backticks but no "to"
    // Matches: - `package` from `v1.0.0`
    const bulletPattern2 = new RegExp(`-\\s*\\\`${escapedPackageName}\\\`\\s+from\\s+\\\`([^\\\`]+)\\\``, 'i');
    const bulletMatch2 = pr.body.match(bulletPattern2);
    if (bulletMatch2?.[1]) {
      return { current: bulletMatch2[1].trim(), new: 'unknown' };
    }

    // Pattern 4: Bullet list without backticks on version
    // Matches: - `package` from v1.0.0
    const bulletPattern3 = new RegExp(`-\\s*\\\`${escapedPackageName}\\\`\\s+from\\s+([\\w.~><=]+)`, 'i');
    const bulletMatch3 = pr.body.match(bulletPattern3);
    if (bulletMatch3?.[1]) {
      return { current: bulletMatch3[1].trim(), new: 'unknown' };
    }

    // Pattern 5: Arrow format without backticks (for Terraform providers with constraints)
    // Matches: azuread: >= 2.0.0 -> >= 3.0.0 or azuread: ~> 2.0 -> ~> 3.0
    const arrowPattern = new RegExp(`${escapedPackageName}[:\\s]+([\\w.~><=]+)\\s*->\\s*([\\w.~><=]+)`, 'i');
    const arrowMatch = pr.body.match(arrowPattern);
    if (arrowMatch?.[1] && arrowMatch?.[2]) {
      return {
        current: arrowMatch[1].trim(),
        new: arrowMatch[2].trim(),
      };
    }

    // Pattern 6: Markdown code block format with version range
    // Matches: from `>= 2.0` to `>= 3.0` in any context
    const codeBlockPattern = /from\s+[`"]?([\\w.~><=]+)[`"]?\s+to\s+[`"]?([\\w.~><=]+)[`"]?/i;
    const codeBlockMatch = pr.body.match(codeBlockPattern);
    if (codeBlockMatch?.[1] && codeBlockMatch?.[2]) {
      return {
        current: codeBlockMatch[1].trim(),
        new: codeBlockMatch[2].trim(),
      };
    }

    return unknown;
  }

  /**
   * Extracts dependency type from Renovate PR based on title, body, and labels
   * Supports 40+ Renovate package managers with accurate detection
   * 
   * PRIORITY 1: Parse PR body table "Type" column (most reliable)
   * PRIORITY 2: Use heuristic detection
   */
  private extractDependencyType(pr: RenovatePR): import('../storage/types').DependencyType {
    const titleLower = pr.title.toLowerCase();
    const bodyLower = (pr.body || '').toLowerCase();
    const labelNames = pr.labels.map(l => l.name.toLowerCase());
    const body = pr.body || '';

    // ==================== PARSE PR BODY TABLE (HIGHEST PRIORITY) ====================
    // Renovate PRs include a markdown table like:
    // | Package | Type | Update | Change |
    // |---------|------|--------|--------|
    // | mongodbatlas | required_provider | major | ~> 1.0 -> ~> 2.0 |
    //
    // The "Type" column is the most reliable source for dependency type detection
    
    // Find table with Type column and extract the value
    const tableMatch = body.match(/\|\s*Package\s*\|\s*Type\s*\|[\s\S]*?\n\|[\s\S]*?\n\|\s*[^|]*\|\s*([^|]+?)\s*\|/i);
    if (tableMatch && tableMatch[1]) {
      const typeValue = tableMatch[1].trim().toLowerCase().replace(/[_\s-]/g, '_');
      
      console.log('[extractDependencyType] Parsed table Type column:', typeValue);
      
      // Map Renovate's "Type" column values to our dependency types
      switch (typeValue) {
        // Terraform providers - MOST RELIABLE
        case 'required_provider':
        case 'required_providers':
          return 'terraform_provider';
        
        // Terraform modules
        case 'module':
          return 'terraform_module';
        
        // Terraform version constraints
        case 'required_version':
          return 'terraform';
        
        // npm/yarn/pnpm types (will determine manager below)
        case 'dependencies':
        case 'devdependencies':
        case 'peerdependencies':
        case 'optionaldependencies':
        case 'engines':
        case 'packagemanager':
        case 'resolutions':
        case 'overrides':
          // Continue to package manager detection
          break;
        
        // Docker
        case 'final':
        case 'stage':
          return 'docker';
        
        // GitHub Actions
        case 'action':
          return 'github_action';
        
        // Go modules
        case 'require':
        case 'indirect':
          return 'gomod';
        
        // PHP Composer
        case 'require_dev':
          return 'composer';
        
        // Maven (specific types)
        case 'parent':
        case 'plugin':
          return 'maven';
        
        // CircleCI
        case 'orb':
          return 'circleci';
        
        // Ansible
        case 'role':
        case 'collection':
          return 'ansible';
        
        // Helm
        case 'chart':
          return 'helm';
        
        // Kubernetes
        case 'image':
          return 'kubernetes';
        
        // NuGet
        case 'packagereference':
          return 'nuget';
        
        // Note: Some types like 'dependencies', 'dev-dependencies', 'build-dependencies' 
        // are generic and used by multiple managers (npm, Cargo, Gradle, etc.)
        // These fall through to heuristic detection below
      }
    }

    // ==================== TERRAFORM (SEPARATE PROVIDER & MODULE) ====================
    // IMPORTANT: Keep terraform_provider and terraform_module separate as requested
    if (titleLower.includes('terraform') || labelNames.some(l => l.includes('terraform'))) {
      // Check for explicit provider/module keywords first
      if (titleLower.includes('terraform provider') || 
          bodyLower.includes('terraform provider') ||
          bodyLower.includes('required_providers')) {
        return 'terraform_provider';
      }
      
      if (titleLower.includes('terraform module') || 
          bodyLower.includes('terraform module')) {
        return 'terraform_module';
      }

      // Module detection patterns (source = "..." in terraform code)
      const isModule =
        titleLower.includes('module') ||
        labelNames.some(l => l.includes('module')) ||
        bodyLower.includes('source = ') ||
        bodyLower.includes('source=') ||
        bodyLower.includes('registry.terraform.io/') && bodyLower.includes('/modules/') ||
        bodyLower.includes('-module-'); // module naming pattern

      if (isModule) return 'terraform_module';

      // Provider detection patterns (provider "..." {} blocks)
      const isProvider =
        titleLower.includes('provider') ||
        labelNames.some(l => l.includes('provider')) ||
        bodyLower.includes('provider "') ||
        bodyLower.includes('provider{') ||
        bodyLower.includes('registry.terraform.io/') && !bodyLower.includes('/modules/') ||
        bodyLower.includes('hashicorp/') ||
        bodyLower.includes('mongodb/'); // Common provider org

      if (isProvider) return 'terraform_provider';

      // Default to terraform_provider if unclear
      return 'terraform_provider';
    }

    // ==================== JAVASCRIPT/TYPESCRIPT ====================
    if (titleLower.includes('npm') || labelNames.some(l => l.includes('npm')) ||
        bodyLower.includes('package.json')) {
      return 'npm';
    }
    
    if (titleLower.includes('yarn') || labelNames.some(l => l.includes('yarn')) ||
        bodyLower.includes('yarn.lock')) {
      return 'yarn';
    }
    
    if (titleLower.includes('pnpm') || labelNames.some(l => l.includes('pnpm')) ||
        bodyLower.includes('pnpm-lock')) {
      return 'pnpm';
    }

    // ==================== PYTHON ====================
    if (titleLower.includes('poetry') || labelNames.some(l => l.includes('poetry')) ||
        bodyLower.includes('pyproject.toml') && bodyLower.includes('poetry')) {
      return 'poetry';
    }

    if (titleLower.includes('pipenv') || labelNames.some(l => l.includes('pipenv')) ||
        bodyLower.includes('pipfile')) {
      return 'pipenv';
    }

    if (titleLower.includes('pip') || titleLower.includes('python') || 
        labelNames.some(l => l.includes('python') || l.includes('pip')) ||
        bodyLower.includes('requirements.txt') || bodyLower.includes('setup.py')) {
      return 'pip';
    }

    // ==================== JAVA ====================
    if (titleLower.includes('maven') || labelNames.some(l => l.includes('maven')) ||
        bodyLower.includes('pom.xml')) {
      return 'maven';
    }

    if (titleLower.includes('gradle') || labelNames.some(l => l.includes('gradle')) ||
        bodyLower.includes('build.gradle') || bodyLower.includes('gradle.properties')) {
      return 'gradle';
    }

    // ==================== GO ====================
    if (titleLower.includes('go ') || titleLower.includes('golang') || 
        labelNames.some(l => l.includes('go') || l.includes('golang')) ||
        bodyLower.includes('go.mod') || bodyLower.includes('go.sum')) {
      return 'gomod';
    }

    // ==================== RUST ====================
    if (titleLower.includes('cargo') || titleLower.includes('rust') || 
        labelNames.some(l => l.includes('cargo') || l.includes('rust')) ||
        bodyLower.includes('cargo.toml')) {
      return 'cargo';
    }

    // ==================== PHP ====================
    if (titleLower.includes('composer') || labelNames.some(l => l.includes('composer')) ||
        bodyLower.includes('composer.json')) {
      return 'composer';
    }

    // ==================== RUBY ====================
    if (titleLower.includes('bundler') || titleLower.includes('gemfile') || 
        labelNames.some(l => l.includes('bundler') || l.includes('ruby')) ||
        bodyLower.includes('gemfile')) {
      return 'bundler';
    }

    // ==================== .NET ====================
    if (titleLower.includes('nuget') || labelNames.some(l => l.includes('nuget')) ||
        bodyLower.includes('.csproj') || bodyLower.includes('packages.config')) {
      return 'nuget';
    }

    // ==================== DOCKER ====================
    if (titleLower.includes('docker') || titleLower.includes('container') ||
        labelNames.some(l => l.includes('docker') || l.includes('container')) ||
        bodyLower.includes('dockerfile') || bodyLower.includes('docker image') ||
        bodyLower.includes('docker.io') || bodyLower.includes('docker-compose')) {
      return 'docker';
    }

    // ==================== KUBERNETES & CLOUD NATIVE ====================
    if (titleLower.includes('kubernetes') || titleLower.includes('k8s') ||
        labelNames.some(l => l.includes('kubernetes') || l.includes('k8s')) ||
        bodyLower.includes('kustomization')) {
      return 'kubernetes';
    }

    if (titleLower.includes('helm') || labelNames.some(l => l.includes('helm')) ||
        bodyLower.includes('chart.yaml') || bodyLower.includes('helm chart')) {
      return 'helm';
    }

    if (titleLower.includes('kustomize') || labelNames.some(l => l.includes('kustomize'))) {
      return 'kustomize';
    }

    // ==================== CI/CD ====================
    if (titleLower.includes('github action') || titleLower.includes('github-action') ||
        labelNames.some(l => l.includes('github-action') || l.includes('actions')) ||
        bodyLower.includes('.github/workflows')) {
      return 'github_action';
    }

    if (titleLower.includes('github-releases') || 
        bodyLower.includes('github.com/') && bodyLower.includes('/releases/')) {
      return 'github_releases';
    }

    if (titleLower.includes('circleci') || labelNames.some(l => l.includes('circleci')) ||
        bodyLower.includes('.circleci/config')) {
      return 'circleci';
    }

    if (titleLower.includes('azure-pipelines') || titleLower.includes('azure pipelines') ||
        labelNames.some(l => l.includes('azure')) ||
        bodyLower.includes('azure-pipelines')) {
      return 'azure_pipelines';
    }

    if (titleLower.includes('gitlab') || labelNames.some(l => l.includes('gitlab')) ||
        bodyLower.includes('.gitlab-ci')) {
      return 'gitlab_ci';
    }

    // ==================== INFRASTRUCTURE AS CODE ====================
    if (titleLower.includes('ansible') || labelNames.some(l => l.includes('ansible')) ||
        bodyLower.includes('ansible-galaxy') || bodyLower.includes('requirements.yml')) {
      return 'ansible';
    }

    if (titleLower.includes('argocd') || titleLower.includes('argo cd') ||
        labelNames.some(l => l.includes('argocd'))) {
      return 'argocd';
    }

    if (titleLower.includes('flux') || labelNames.some(l => l.includes('flux'))) {
      return 'flux';
    }

    // ==================== OTHER MANAGERS ====================
    if (titleLower.includes('bazel') || labelNames.some(l => l.includes('bazel')) ||
        bodyLower.includes('build.bazel') || bodyLower.includes('workspace')) {
      return 'bazel';
    }

    if (titleLower.includes('cocoapods') || titleLower.includes('podfile') ||
        labelNames.some(l => l.includes('cocoapods')) ||
        bodyLower.includes('podfile')) {
      return 'cocoapods';
    }

    if (titleLower.includes('swift') || labelNames.some(l => l.includes('swift')) ||
        bodyLower.includes('package.swift')) {
      return 'swift';
    }

    if (titleLower.includes('homebrew') || labelNames.some(l => l.includes('homebrew')) ||
        bodyLower.includes('homebrew') || bodyLower.includes('brew formula')) {
      return 'homebrew';
    }

    if (titleLower.includes('asdf') || labelNames.some(l => l.includes('asdf')) ||
        bodyLower.includes('.tool-versions')) {
      return 'asdf';
    }

    // ==================== FALLBACK/GENERIC TYPES ====================
    // These are kept for backward compatibility and edge cases
    if (titleLower.includes('workflow')) {
      return 'workflow';
    }

    if (titleLower.includes('action')) {
      return 'action';
    }

    if (titleLower.includes('provider')) {
      return 'provider';
    }

    // Default to package for unrecognized types
    return 'package';
  }

  parseDependencyFromPRTitle(pr: RenovatePR): DependencyFromPR | null {
    // Common Renovate PR title patterns - from most specific to most general
    const patterns = [
      // "Update dependency @scope/package to v1.2.3"
      /Update dependency (@?[\w\-/.]+) to (v?[\d.~><=^]+)/i,
      // "Update @scope/package to v1.2.3" or "Update @scope/package to ~> 1.2.3"
      /Update (?:Terraform |action )?(@?[\w\-/.@]+) to (v?[\d.~><=^]+)/i,
      // "chore(deps): update @scope/package to v1.2.3" or "chore(deps): update terraform @scope/package to v1.2.3"
      /update (?:terraform )?(@?[\w\-/.@]+) to (v?[\d.~><=^]+)/i,
      // "Update @scope/package digest to abc123"
      /Update (?:Terraform |action )?(@?[\w\-/.@]+) digest to ([\w.]+)/i,
      // "Pin dependency @scope/package to 1.2.3"
      /Pin dependency (@?[\w\-/.@]+) to (v?[\d.~><=^]+)/i,
      // "fix(deps): Update @scope/package to v1.2.3" or "fix(deps): Update Terraform @scope/package to v1.2.3"
      /fix\(deps\):\s*Update (?:Terraform |action )?(@?[\w\-/.@]+) to (v?[\d.~><=^]+)/i,
      // More flexible patterns for edge cases
      // "Update @scope/package" (package name only, version can be extracted from body)
      /Update (?:Terraform |action |dependency )?(@?[\w\-/.@]+)(?:\s|$)/i,
      // "Renovate: Update @scope/package to ..."
      /Renovate:\s*Update (?:Terraform |action |dependency )?(@?[\w\-/.@]+) to (v?[\d.~><=^]+)/i,
    ];

    for (const pattern of patterns) {
      const match = pr.title.match(pattern);
      if (match?.[1]) {
        const packageName = match[1];
        let newVersion = match[2];

        // If no version found in title, extract from PR body
        if (!newVersion) {
          const versions = this.extractVersionsFromPRBody(pr, packageName);
          newVersion = versions.new !== 'unknown' ? versions.new : 'unknown';
        }

        // Skip if we couldn't extract any useful version info
        if (!newVersion || newVersion === 'unknown') {
          continue;
        }

        // Check for digest or pin first (these take precedence)
        let updateType = '';
        if (pr.title.toLowerCase().includes('digest')) {
          updateType = 'digest';
        } else if (pr.title.toLowerCase().includes('pin')) {
          updateType = 'pin';
        } else {
          // Check labels for explicit update type
          if (pr.labels.some(l => l.name.includes('major'))) {
            updateType = 'major';
          } else if (pr.labels.some(l => l.name.includes('minor'))) {
            updateType = 'minor';
          } else if (pr.labels.some(l => l.name.includes('patch'))) {
            updateType = 'patch';
          } else {
            // Extract versions and compare them
            const versions = this.extractVersionsFromPRBody(pr, packageName);
            if (versions.current !== 'unknown' && versions.new !== 'unknown') {
              updateType = this.compareVersions(versions.current, versions.new);
            } else {
              // Fallback to label detection or default to minor
              updateType = 'minor';
            }
          }
        }

        // Determine package manager from labels or package name
        let packageManager = 'npm';
        if (pr.labels.some(l => l.name.includes('docker'))) packageManager = 'docker';
        else if (pr.labels.some(l => l.name.includes('pip') || l.name.includes('python'))) packageManager = 'pip';
        else if (pr.labels.some(l => l.name.includes('maven') || l.name.includes('java'))) packageManager = 'maven';
        else if (pr.labels.some(l => l.name.includes('nuget') || l.name.includes('.net'))) packageManager = 'nuget';
        else if (pr.labels.some(l => l.name.includes('go'))) packageManager = 'gomod';
        else if (pr.labels.some(l => l.name.includes('terraform'))) packageManager = 'terraform';

        // Determine dependency type
        const dependencyType = this.extractDependencyType(pr);

        // Extract both current and new versions from PR body
        const versions = this.extractVersionsFromPRBody(pr, packageName);

        return {
          packageName,
          packageManager,
          dependencyType,
          currentVersion: versions.current,
          newVersion: versions.new !== 'unknown' ? versions.new : newVersion,
          updateType,
          prNumber: pr.number,
          prUrl: pr.html_url,
        };
      }
    }

    return null;
  }

  async getDependenciesFromPRs(repoName: string): Promise<DependencyFromPR[]> {
    const prs = await this.getRenovatePRs(repoName);
    const dependencies: DependencyFromPR[] = [];
    const filteredPRs: { number: number; title: string; reason: string }[] = [];

    console.log(`[GitHub Service] Processing ${prs.length} PRs for ${repoName}`);

    for (const pr of prs) {
      const dep = this.parseDependencyFromPRTitle(pr);
      if (dep) {
        dependencies.push(dep);
        console.log(`[GitHub Service] ✓ PR #${pr.number}: "${pr.title}" → ${dep.packageName}`);
      } else {
        // Track PRs that failed to parse for debugging
        filteredPRs.push({
          number: pr.number,
          title: pr.title,
          reason: 'Failed to extract version information',
        });
        console.log(`[GitHub Service] ✗ PR #${pr.number}: "${pr.title}" → FILTERED (no version extracted)`);
      }
    }

    // Log summary of filtered PRs
    console.log(`[GitHub Service] ${repoName}: ${dependencies.length}/${prs.length} PRs parsed successfully`);
    if (filteredPRs.length > 0) {
      console.warn(`[GitHub Service] ${repoName}: ${filteredPRs.length} of ${prs.length} Renovate PRs filtered out (missing version extraction)`);
      filteredPRs.forEach(pr => {
        console.warn(`  - PR #${pr.number}: "${pr.title}"`);
      });
    }

    return dependencies;
  }

  async getRateLimit(): Promise<{ remaining: number; limit: number; reset: Date }> {
    const response = await this.octokit.rest.rateLimit.get();
    return {
      remaining: response.data.rate.remaining,
      limit: response.data.rate.limit,
      reset: new Date(response.data.rate.reset * 1000),
    };
  }

  /**
   * Get top contributors for a repository
   */
  async getRepositoryContributors(repoName: string, limit = 5): Promise<Array<{
    login: string;
    avatarUrl: string;
    profileUrl: string;
    contributions: number;
  }>> {
    const cacheKey = `contributors:${repoName}`;
    const cached = this.getCached<Array<{
      login: string;
      avatarUrl: string;
      profileUrl: string;
      contributions: number;
    }>>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await this.octokit.rest.repos.listContributors({
        owner: this.org,
        repo: repoName,
        per_page: limit,
      });

      const contributors = data.map(contributor => ({
        login: contributor.login || 'unknown',
        avatarUrl: contributor.avatar_url || '',
        profileUrl: contributor.html_url || '',
        contributions: contributor.contributions || 0,
      }));

      this.setCache(cacheKey, contributors);
      return contributors;
    } catch (error) {
      console.error(`Error fetching contributors for ${repoName}:`, error);
      return [];
    }
  }
}

export const githubService = new GitHubService();
