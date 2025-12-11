# Open Renovate PRs Table - Sorting Implementation

## Overview

The "Open Renovate PRs" table in the Repository Detail page now has a **three-tier sorting system** to organize PRs logically.

## Sorting Order

### 1. **Primary Sort: Update Type** (Priority Order)

PRs are sorted first by the severity/importance of the update:

| Priority | Update Type | Badge Color | Description |
|----------|-------------|-------------|-------------|
| 1 | `major` | Red (danger) | Breaking changes, high priority |
| 2 | `minor` | Yellow (warning) | New features, medium priority |
| 3 | `patch` | Green (success) | Bug fixes, low priority |
| 4 | `digest` | Blue (info) | Docker image digest updates |
| 5 | `pin` | Blue (info) | Pin to specific version |
| 6 | `rollback` | - | Version rollback |
| 7 | `bump` | - | Generic version bump |
| 999 | `null` | Gray | Unknown/unclassified |

**Rationale:** Most critical updates (major) appear first, less critical (patch) appear last.

---

### 2. **Secondary Sort: Dependency Type** (Alphabetical)

Within each update type group, PRs are sorted alphabetically by dependency type:

| Example Order | Type | Example Packages |
|---------------|------|------------------|
| 1 | `ansible` | Ansible roles |
| 2 | `cargo` | Rust packages |
| 3 | `composer` | PHP packages |
| 4 | `docker` | Docker images |
| 5 | `github_action` | GitHub Actions |
| 6 | `gomod` | Go modules |
| 7 | `helm` | Helm charts |
| 8 | `maven` | Maven dependencies |
| 9 | `npm` | npm packages |
| 10 | `terraform_module` | Terraform modules |
| 11 | `terraform_provider` | Terraform providers |
| ... | ... | ... |

**Rationale:** Alphabetical sorting makes it easy to find all PRs of a specific type together.

---

### 3. **Tertiary Sort: Package Name** (Alphabetical)

Within each dependency type group, PRs are sorted alphabetically by package name:

**Example:**
```
major updates:
  - terraform_provider: aws (hashicorp/aws)
  - terraform_provider: azurerm (hashicorp/azurerm)
  - terraform_provider: mongodbatlas (mongodb/mongodbatlas)
  
minor updates:
  - npm: eslint
  - npm: prettier
  - npm: typescript
```

**Rationale:** Makes it easy to locate specific packages within the same type and update category.

---

## Example Sorting Result

Given these PRs:

| PR # | Package | Type | Update Type |
|------|---------|------|-------------|
| #101 | eslint | npm | minor |
| #102 | aws | terraform_provider | major |
| #103 | prettier | npm | patch |
| #104 | mongodbatlas | terraform_provider | major |
| #105 | typescript | npm | minor |
| #106 | node | docker | major |

**After Sorting:**

| Order | PR # | Package | Type | Update Type | Sort Logic |
|-------|------|---------|------|-------------|-----------|
| 1 | #106 | node | docker | major | major → docker → node |
| 2 | #102 | aws | terraform_provider | major | major → terraform_provider → aws |
| 3 | #104 | mongodbatlas | terraform_provider | major | major → terraform_provider → mongodbatlas |
| 4 | #101 | eslint | npm | minor | minor → npm → eslint |
| 5 | #105 | typescript | npm | minor | minor → npm → typescript |
| 6 | #103 | prettier | npm | patch | patch → npm → prettier |

---

## Implementation Details

### Backend Sorting

**File:** `backend/src/routes/dependency.routes.ts`

```typescript
const sortedPRs = enrichedPRs.sort((a, b) => {
  // Primary sort: Update type
  const priorityA = a.updateType ? (updateTypePriority[a.updateType] || 999) : 999;
  const priorityB = b.updateType ? (updateTypePriority[b.updateType] || 999) : 999;
  
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  
  // Secondary sort: Dependency type (alphabetical)
  const typeA = a.dependencyType || '';
  const typeB = b.dependencyType || '';
  
  if (typeA !== typeB) {
    return typeA.localeCompare(typeB);
  }
  
  // Tertiary sort: Package name (alphabetical)
  const packageA = a.packageName || '';
  const packageB = b.packageName || '';
  return packageA.localeCompare(packageB);
});
```

### Frontend Display

**File:** `frontend/src/pages/RepositoryDetail.tsx`

The frontend receives pre-sorted data from the backend API endpoint:
- `GET /api/dependencies/prs/:repositoryId`

No client-side sorting is performed - the backend handles all sorting logic.

---

## User Benefits

### 1. **Quick Prioritization**
- ✅ Critical `major` updates appear at the top
- ✅ Less urgent `patch` updates appear at the bottom
- ✅ Easy to identify which PRs need immediate attention

### 2. **Grouped by Technology**
- ✅ All Terraform providers together
- ✅ All npm packages together
- ✅ All Docker images together
- ✅ Easy to review related dependencies

### 3. **Predictable Order**
- ✅ Consistent alphabetical sorting
- ✅ Easy to find specific packages
- ✅ No random ordering on page refresh

### 4. **At-a-Glance Overview**
```
[MAJOR UPDATES - RED]
  🐳 Docker:
    - node 18 → 19
  
  ⚙️ Terraform Providers:
    - aws 4.x → 5.0
    - mongodbatlas 1.0 → 2.0

[MINOR UPDATES - YELLOW]
  📦 npm:
    - eslint 8.0 → 8.1
    - typescript 5.0 → 5.1

[PATCH UPDATES - GREEN]
  📦 npm:
    - prettier 3.0.0 → 3.0.1
```

---

## Testing

### Test Case 1: Mixed Update Types

**Input:**
- 5 major updates (various types)
- 3 minor updates (various types)
- 7 patch updates (various types)

**Expected:**
1. All major updates first (sorted by type, then package)
2. All minor updates next (sorted by type, then package)
3. All patch updates last (sorted by type, then package)

### Test Case 2: Same Type, Different Updates

**Input:**
- 3 Terraform provider majors
- 2 Terraform provider minors
- 1 Terraform provider patch

**Expected:**
1. All 3 majors (alphabetically: aws, azurerm, mongodbatlas)
2. Both 2 minors (alphabetically)
3. The 1 patch

### Test Case 3: Same Package, Different Versions

This shouldn't happen in practice (Renovate creates one PR per package), but if it does:
- Sorted by update type first
- Then by dependency type
- Then by package name (same name = same position)

---

## Performance

- **Sorting Complexity:** O(n log n) where n = number of open PRs
- **Typical PR Count:** 5-50 PRs per repository
- **Performance Impact:** Negligible (<1ms for 100 PRs)
- **Location:** Backend (one-time sort at API response)

---

## Configuration

The sorting behavior is **hardcoded** and not configurable. This ensures consistency across all repositories and users.

To modify the sorting logic:
1. Edit `backend/src/routes/dependency.routes.ts`
2. Modify the `updateTypePriority` object for update type order
3. Modify the comparison functions for secondary/tertiary sorting

---

## Related Features

- **Update Type Badges:** Visual indicators (red/yellow/green) for update severity
- **Dependency Type Icons:** Visual indicators for technology type
- **PR Filtering:** Future enhancement to filter by type/update
- **Table Export:** Future enhancement to export sorted table

---

## Migration Notes

**Breaking Changes:** None - this is purely a sorting improvement

**Data Changes:** None - no database schema changes

**Client Impact:** 
- Users will see PRs in a new, more logical order
- No action required from users
- Existing workflows unaffected

---

## Future Enhancements

Potential improvements:

1. **Client-Side Sorting**
   - Add sortable column headers
   - Allow users to customize sort order
   - Toggle ascending/descending

2. **Grouping**
   - Visual group separators (major/minor/patch)
   - Collapsible groups
   - Group statistics (e.g., "5 major updates")

3. **Filtering**
   - Filter by update type
   - Filter by dependency type
   - Search by package name

4. **Priority Customization**
   - User-defined priority order
   - Per-repository sort preferences
   - Save sort preferences

---

**Implemented:** December 2025  
**Affects:** Repository Detail page "Open Renovate PRs" table  
**Status:** ✅ Production Ready  
**Performance:** Excellent (O(n log n))

