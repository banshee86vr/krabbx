# One Data Point Per Scan - Fix

## Issue

When clicking "Scan Now" once, the dependency trends chart was showing **multiple bars** (one per repository) instead of **one bar** representing the entire organization scan.

### Example Problem

**User Action:** Click "Scan Now" button once

**Expected:** 1 bar on chart  
**Actual:** 5 bars on chart (if org has 5 repositories)

**Screenshot Evidence:**
```
Dec 4 08:38 - Bar 1 (repo 1)
Dec 4 08:38 - Bar 2 (repo 2)  ← Multiple bars at same timestamp!
Dec 4 08:38 - Bar 3 (repo 3)
Dec 4 08:38 - Bar 4 (repo 4)
Dec 4 08:38 - Bar 5 (repo 5)
```

## Root Cause

The system was creating a `ScanHistory` entry **for each repository** during an organization scan:

```typescript
// ❌ OLD CODE - Inside scanRepository()
for (const repo of reposToScan) {
  await this.scanRepository(repo.name);
  
  // This created a scan history entry PER REPOSITORY
  await storage.createScanHistory({
    repositoryId: repo.id,
    scanType: 'incremental',  // Per-repo scan
    // ...
  });
}
```

**Result:** 
- Scan 5 repos → 5 scan history entries
- All with timestamps within seconds of each other
- Chart shows 5 bars clustered together

## Solution

### 1. Create ONE Aggregated Scan History Entry

The `scanOrganization()` function now creates **one aggregated entry** after scanning all repositories:

```typescript
// ✅ NEW CODE - After all repos scanned
async scanOrganization() {
  const results: ScanResult[] = [];
  
  // Scan all repositories (no individual history entries created)
  for (const repo of reposToScan) {
    const result = await this.scanRepository(repo.name);
    results.push(result);
  }
  
  // Get ALL dependencies and deduplicate by package name
  const { data: allDependencies } = await storage.getDependencies({});
  
  // Deduplicate - count each package ONCE across entire org
  const uniquePackages = new Map();
  for (const dep of allDependencies) {
    const key = `${dep.packageName}@${dep.packageManager}`;
    if (!uniquePackages.has(key)) {
      uniquePackages.set(key, {
        isOutdated: dep.isOutdated,
        hasOpenPR: dep.hasOpenPR,
      });
    } else {
      const existing = uniquePackages.get(key);
      existing.isOutdated = existing.isOutdated || dep.isOutdated;
      existing.hasOpenPR = existing.hasOpenPR || dep.hasOpenPR;
    }
  }
  
  // Count UNIQUE packages (not sum of all repos!)
  const totalUniqueDeps = uniquePackages.size;
  const outdatedUniqueDeps = Array.from(uniquePackages.values())
    .filter(p => p.isOutdated).length;
  const openPRsUniqueDeps = Array.from(uniquePackages.values())
    .filter(p => p.hasOpenPR).length;
  
  await storage.createScanHistory({
    repositoryId: results[0].repositoryId, // Placeholder
    scanType: 'full',  // Mark as organization scan
    status: 'completed',
    totalDependencies: totalUniqueDeps,        // UNIQUE packages across org
    outdatedDependencies: outdatedUniqueDeps,  // UNIQUE outdated packages
    newUpdatesFound: results.reduce((sum, r) => sum + r.newUpdatesFound, 0),
    openPRs: openPRsUniqueDeps,                // UNIQUE packages with open PRs
    durationMs: totalScanTime,
    errorMessage: null,
  });
}
```

**Key Change:** Dependencies are **deduplicated by package name**. If `react` is used by 5 repositories, it's counted **once**.

### 2. Filter Chart Data to Organization Scans Only

The `getDashboardTrends()` function now filters to **only `scanType: 'full'`**:

```typescript
// ✅ Memory Storage
const filteredHistory = this.scanHistory
  .filter(scan => 
    scan.createdAt >= startDate && 
    scan.status === 'completed' &&
    scan.scanType === 'full'  // ONLY organization scans
  );

// ✅ Database Storage  
const scanHistory = await this.prisma.scanHistory.findMany({
  where: {
    createdAt: { gte: startDate },
    status: 'completed',
    scanType: 'full',  // ONLY organization scans
  },
});
```

### 3. Removed Individual Repository History

Individual repository scans **no longer create history entries** (commented out in `scanRepository()`):

```typescript
// scanRepository() - No longer creates history entries
async scanRepository(repoName: string) {
  // ... scan logic ...
  
  // Individual scan history creation REMOVED
  // (commented out with explanation)
  
  return {
    repositoryId: repo.id,
    totalDependencies: count,
    outdatedDependencies: outdatedCount,
    newUpdatesFound: updates,
    openPRs: openPRsCount,
  };
}
```

## Scan Type Distinction

### `scanType: 'full'` (Organization Scan)
- ✅ Created by `scanOrganization()`
- ✅ Aggregates data from ALL scanned repositories
- ✅ **Shows on dashboard chart**
- ✅ One entry per "Scan Now" button click

### `scanType: 'incremental'` (Individual Repository)
- Created by `scanRepository()` when called directly
- Tracks single repository scans
- **NOT shown on dashboard chart**
- Used for individual repo scan tracking

### `scanType: 'manual'`
- Reserved for manual/API-triggered scans
- Currently unused

## Data Aggregation Example

**Organization with 5 repositories:**

| Repository | Dependencies |
|------------|--------------|
| repo-1 | react, lodash, axios, typescript |
| repo-2 | react, lodash, express |
| repo-3 | react, typescript, webpack |
| repo-4 | lodash, eslint |
| repo-5 | (no dependencies) |

**Without Deduplication (WRONG):**
```
Total = 4 + 3 + 3 + 2 + 0 = 12 dependencies
```
❌ Counts `react` 3 times, `lodash` 3 times

**With Deduplication (CORRECT):**
```
Unique packages: react, lodash, axios, typescript, express, webpack, eslint
Total = 7 unique dependencies
```
✅ Each package counted once

**If react, lodash, and axios have open PRs:**
```json
{
  "scanType": "full",
  "totalDependencies": 7,       // 7 unique packages
  "outdatedDependencies": 4,    // 4 unique outdated packages
  "openPRs": 3,                 // 3 unique packages with PRs
  "timestamp": "2025-12-04T08:38:00Z"
}
```

**Chart Display:** **ONE bar** at Dec 4 08:38 showing 7 total deps, **ONE dot** showing 3 open PRs.

**Relationship:** Total Dependencies (7) ≥ Open PRs (3) ✅ Logical!

## Benefits

### 1. **Accurate Representation**
- ✅ One scan action → One chart data point
- ✅ User intent matches visual display
- ✅ No confusion about multiple bars

### 2. **Clean Chart**
- ✅ Clear timeline of scans
- ✅ Easy to compare scans over time
- ✅ No cluttered clusters of bars

### 3. **Meaningful Aggregation**
- ✅ Shows organization-wide metrics
- ✅ Total dependencies across all repos
- ✅ Total open PRs across all repos

### 4. **Performance**
- ✅ Fewer data points = faster rendering
- ✅ Less database records to query
- ✅ Cleaner data model

## Migration Steps

### For Memory Mode (No Migration Needed)

1. **Restart backend:**
   ```bash
   pnpm run dev
   ```

2. **Run a new scan:**
   - Click "Scan Now" button
   - Wait for completion
   - Check chart shows **1 new bar**

3. **Old data:**
   - Previous multi-entry scans cleared on restart
   - Fresh start with correct behavior

### For Database Mode (Migration Required)

1. **Run Prisma migration:**
   ```bash
   cd backend
   npx prisma migrate dev --name add-open-prs-to-scan-history
   ```

2. **Restart backend:**
   ```bash
   pnpm run dev
   ```

3. **Run a new scan:**
   - Click "Scan Now" button
   - Check chart shows **1 new bar**

4. **Old data:**
   - Old per-repository entries still in database
   - Won't show on chart (filtered by `scanType: 'full'`)
   - Can be cleaned up with SQL if desired:
     ```sql
     DELETE FROM "ScanHistory" WHERE "scanType" = 'incremental';
     ```

## Verification

### Test 1: Single Scan

**Steps:**
1. Open dashboard
2. Note current number of bars
3. Click "Scan Now"
4. Wait for scan to complete
5. Check chart

**Expected Result:**
- ✅ Exactly **1 new bar** appears
- ✅ Bar height = total deps across all repos
- ✅ Green dot = total open PRs across all repos

### Test 2: Multiple Scans

**Steps:**
1. Click "Scan Now"
2. Wait for completion
3. Wait 5 minutes
4. Click "Scan Now" again
5. Wait for completion

**Expected Result:**
- ✅ Exactly **2 bars** on chart
- ✅ Bars at different timestamps (5 minutes apart)
- ✅ Each bar represents one organization scan

### Test 3: API Response

**Check raw data:**
```bash
# In browser console or terminal
curl http://localhost:3001/api/dashboard/trends?days=30 | jq '.dependencyTrends | length'
```

**Expected:**
- Number matches number of times you clicked "Scan Now"
- NOT number of repositories

## Debug

If you still see multiple bars per scan:

### 1. Check Scan Type Filter

```typescript
// In storage implementations, verify this filter exists:
scan.scanType === 'full'
```

### 2. Check Console Logs

Backend should log:
```
[Scan] Starting organization scan...
[Scan] Found 5 repositories
[Scan] Scanning repo: repo-1
[Scan] Scanning repo: repo-2
[Scan] Scanning repo: repo-3
[Scan] Scanning repo: repo-4
[Scan] Scanning repo: repo-5
[Scan] Created aggregated scan history: 150 total deps, 8 open PRs  ← Should see this!
[Scan] Completed. Scanned 5 repositories.
```

### 3. Check Database

```sql
-- Should show ONE entry per organization scan
SELECT "scanType", "totalDependencies", "createdAt" 
FROM "ScanHistory" 
WHERE "scanType" = 'full'
ORDER BY "createdAt" DESC;
```

## What Changed

### Files Modified:

1. **`backend/src/services/renovate.service.ts`**
   - Added aggregated scan history creation in `scanOrganization()`
   - Removed individual scan history creation in `scanRepository()`
   - Added `openPRs` to `ScanResult` interface

2. **`backend/src/storage/memory.storage.ts`**
   - Added filter: `scan.scanType === 'full'`
   - Updated to return only organization-level scans

3. **`backend/src/storage/database.storage.ts`**
   - Added filter: `scanType: 'full'`
   - Updated to query only organization-level scans

4. **`backend/src/storage/types.ts`**
   - Added `openPRs: number` to `ScanHistory` interface
   - Updated `getDashboardTrends` return type

5. **`backend/prisma/schema.prisma`**
   - Added `openPRs Int @default(0)` to `ScanHistory` model

6. **`frontend/src/pages/Dashboard.tsx`**
   - Changed from `AreaChart` to `ComposedChart`
   - Bar chart for total dependencies
   - Line chart for open PRs

## Summary

### Before Fix:
- ❌ 1 organization scan → N bars (N = number of repos)
- ❌ Cluttered chart with duplicate timestamps
- ❌ Per-repository granularity (too detailed for org view)

### After Fix:
- ✅ 1 organization scan → 1 bar
- ✅ Clean chart with clear timeline
- ✅ Organization-level aggregation (appropriate for dashboard)

---

**Fixed:** December 2025  
**Issue:** Multiple data points per scan  
**Solution:** Aggregate scan history at organization level  
**Status:** ✅ Production Ready  
**Migration:** Required for database mode

