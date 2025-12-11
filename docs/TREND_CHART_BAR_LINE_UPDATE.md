# Trend Chart Update - Bar Chart with Line Overlay

## Overview

The Dependency Trends chart has been transformed from an area chart to a **combination bar and line chart**:
- **Bars**: Total number of detected dependencies per scan
- **Line**: Number of dependencies with open PRs per scan
- **Data Points**: Each represents a single complete scan (no aggregation)

## Visual Design

### Before (Area Chart)
```
Multiple overlapping areas showing:
- Total dependencies (purple area)
- Outdated dependencies (yellow area)
```

### After (Bar + Line Chart)
```
│
│  ●────●────●  ← Open PRs (green line with dots)
│  █    █    █  ← Total Dependencies (blue bars)
└──────────────
   Scan timestamps
```

## Chart Components

### 1. **Bars - Total Dependencies**
- **Color:** Indigo (#4f46e5)
- **Data:** `totalDependencies` from each scan
- **Style:** Rounded corners at top
- **Purpose:** Shows the complete dependency count discovered per scan

### 2. **Line - Open PRs**
- **Color:** Green (#10b981)
- **Data:** `openPRs` from each scan
- **Style:** 
  - Line width: 3px
  - Dots at each data point (4px radius)
  - Active dot: 6px radius
- **Purpose:** Tracks how many dependencies have active Renovate PRs

### 3. **Legend**
- **Position:** Below chart
- **Font Size:** 12px
- **Items:** "Total Dependencies", "Open PRs"

## Data Structure

### New Field Added: `openPRs`

**ScanHistory Interface:**
```typescript
export interface ScanHistory {
  id: string;
  repositoryId: string;
  scanType: ScanType;
  status: ScanStatus;
  totalDependencies: number;
  outdatedDependencies: number;
  newUpdatesFound: number;
  openPRs: number;  // ← NEW FIELD
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: Date;
}
```

### API Response

**GET /api/dashboard/trends?days=30**
```typescript
{
  "dependencyTrends": [
    {
      "date": "2025-12-01",
      "timestamp": "2025-12-01T10:30:00.000Z",
      "totalDependencies": 150,
      "outdatedDependencies": 25,
      "newUpdates": 5,
      "openPRs": 12,  // ← NEW FIELD
      "scans": 1
    },
    // ... more scan results
  ],
  "adoptionHistory": {
    "currentAdopted": 42,
    "currentTotal": 50
  }
}
```

## Implementation Changes

### 1. Backend - Database Schema

**File:** `backend/prisma/schema.prisma`

```prisma
model ScanHistory {
  // ... existing fields ...
  openPRs               Int      @default(0)  // ← ADDED
  // ... rest of model ...
}
```

**Migration Required:**
```bash
cd backend
npx prisma migrate dev --name add-open-prs-to-scan-history
```

### 2. Backend - Storage Types

**File:** `backend/src/storage/types.ts`

- Added `openPRs: number` to `ScanHistory` interface
- Added `openPRs: number` to `getDashboardTrends` return type

### 3. Backend - Renovate Service

**File:** `backend/src/services/renovate.service.ts`

```typescript
// Calculate open PRs count during scan
const openPRsCount = allDeps.filter(d => d.hasOpenPR).length;

// Pass to scan history
await storage.createScanHistory({
  // ... other fields ...
  openPRs: openPRsCount,  // ← ADDED
});
```

### 4. Backend - Storage Implementations

**Files:**
- `backend/src/storage/memory.storage.ts`
- `backend/src/storage/database.storage.ts`

Both updated to:
- Include `openPRs` in `getDashboardTrends` mapping
- Handle `openPRs` field in scan history creation

### 5. Frontend - Chart Component

**File:** `frontend/src/pages/Dashboard.tsx`

**Changed from:**
- `AreaChart` with two `Area` components

**Changed to:**
- `ComposedChart` with:
  - One `Bar` component (total dependencies)
  - One `Line` component (open PRs)
  - `Legend` component

## Data Integrity

### Each Data Point Represents

✅ **One Complete Scan Event**
- Timestamp: Exact time of scan completion
- Total Dependencies: Count at that moment
- Open PRs: Count of dependencies with open PRs at that moment

❌ **NOT Aggregated**
- Not averaged over time
- Not grouped by day
- Not interpolated

### Example Timeline

```
Dec 1, 10:00 - Scan #1: 150 total deps, 10 open PRs
Dec 1, 15:30 - Scan #2: 152 total deps, 12 open PRs (2 new PRs opened)
Dec 2, 09:15 - Scan #3: 152 total deps, 11 open PRs (1 PR merged)
Dec 2, 14:00 - Scan #4: 155 total deps, 13 open PRs (3 deps added, 2 PRs)
```

Chart shows **4 distinct bars and 4 points on the line**.

## Visual Benefits

### 1. **Clear Distinction**
- Bars show dependency growth/shrinkage
- Line shows PR activity trends
- Easy to correlate: "When deps increase, do PRs increase?"

### 2. **Scan-by-Scan Granularity**
- See exact state at each scan
- No information loss from aggregation
- Track real-time changes

### 3. **Trend Analysis**
```
High bars + Low line = Many deps, few PRs (action needed!)
High bars + High line = Many deps, many PRs (good coverage)
Low bars + Low line = Few deps, few PRs (small project or healthy)
Stable bars + Rising line = PRs catching up with deps
```

### 4. **Professional Appearance**
- Industry-standard bar+line combination
- Clean, modern design
- Consistent with dashboard theme

## User Experience

### Tooltip Information

Hovering over any data point shows:
```
Nov 20, 10:30 AM
━━━━━━━━━━━━━━━
Total Dependencies: 150
Open PRs: 12
```

### Legend Interaction

Users can click legend items to:
- Hide/show bars (Total Dependencies)
- Hide/show line (Open PRs)
- Focus on specific metrics

## Performance

### Chart Rendering
- **Library:** Recharts (optimized for React)
- **Data Points:** Typically 10-50 per 30 days
- **Performance:** Smooth, no lag
- **Responsiveness:** Scales to container width

### Data Fetching
- **Endpoint:** `/api/dashboard/trends?days=30`
- **Cache:** React Query (1 minute)
- **Real-time:** Invalidates on scan complete

## Migration Notes

### Database Mode

**Required Steps:**
1. Run Prisma migration:
   ```bash
   cd backend
   npx prisma migrate dev --name add-open-prs-to-scan-history
   ```

2. Restart backend server:
   ```bash
   pnpm run dev
   ```

3. **Existing Data:** 
   - Old scans will have `openPRs = 0` (default)
   - New scans will have accurate counts
   - Historical data limitations acceptable

### Memory Mode

**Required Steps:**
1. Restart backend server:
   ```bash
   pnpm run dev
   ```

2. **Existing Data:**
   - In-memory data cleared on restart
   - First scan after restart will populate correctly
   - No migration needed

## Testing

### Verification Steps

1. **Run Multiple Scans:**
   ```bash
   # Click "Scan Now" button 3-4 times
   # Wait a few seconds between scans
   ```

2. **Check Chart:**
   - Should see 3-4 blue bars
   - Should see 3-4 green dots connected by line
   - Hover to verify data accuracy

3. **Verify Data:**
   ```bash
   # In browser console:
   fetch('/api/dashboard/trends?days=30')
     .then(r => r.json())
     .then(d => console.table(d.dependencyTrends))
   ```

4. **Expected Output:**
   ```
   ┌─────┬──────────────────────┬───────────────────┬─────────┐
   │ idx │ timestamp            │ totalDependencies │ openPRs │
   ├─────┼──────────────────────┼───────────────────┼─────────┤
   │  0  │ 2025-12-01T10:30:00Z │       150         │   10    │
   │  1  │ 2025-12-01T15:30:00Z │       152         │   12    │
   │  2  │ 2025-12-02T09:15:00Z │       152         │   11    │
   └─────┴──────────────────────┴───────────────────┴─────────┘
   ```

## Troubleshooting

### Chart Shows No Data

**Possible Causes:**
1. No scans run yet → Run first scan
2. All scans older than 30 days → Run new scan
3. All scans have status ≠ 'completed' → Check scan errors

### Open PRs Line at Zero

**Possible Causes:**
1. No dependencies have open PRs → Normal if no Renovate PRs
2. Using old database (pre-migration) → Run migration
3. Memory storage restarted → Run new scan

### Bars Too Narrow/Wide

**Solution:** This is automatic based on number of data points
- Few scans → Wide bars
- Many scans → Narrow bars
- Optimal viewing: 5-20 scans in range

## Related Files

- `backend/prisma/schema.prisma` - Database schema
- `backend/src/storage/types.ts` - TypeScript interfaces
- `backend/src/storage/memory.storage.ts` - Memory storage implementation
- `backend/src/storage/database.storage.ts` - Database storage implementation
- `backend/src/services/renovate.service.ts` - Scan logic and PR counting
- `frontend/src/pages/Dashboard.tsx` - Chart component

## Future Enhancements

### Potential Additions

1. **Additional Lines:**
   - Outdated dependencies trend
   - Merge rate (PRs closed per day)

2. **Bar Segmentation:**
   - Stack bars by update type (major/minor/patch)
   - Different colors for outdated vs up-to-date

3. **Interactivity:**
   - Click bar → View scan details
   - Click line point → View open PRs at that time

4. **Time Range Selector:**
   - Last 7 days
   - Last 30 days (current)
   - Last 90 days
   - Custom range

---

**Implemented:** December 2025  
**Chart Type:** ComposedChart (Bar + Line)  
**Data Granularity:** Per-scan (no aggregation)  
**Status:** ✅ Production Ready  
**Migration:** Required for database mode

