import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cn,
  formatDate,
  formatRelativeTime,
  getDependencyTypeColor,
  getDependencyTypeIcon,
  getDependencyTypeLabel,
  getPackageManagerIcon,
  getUpdateTypeColor,
  truncate,
} from '../src/lib/utils';

describe('cn', () => {
  it('merges class names and lets later Tailwind utilities win', () => {
    expect(cn('text-red-500', 'font-semibold', 'text-blue-500')).toBe(
      'font-semibold text-blue-500'
    );
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats recent timestamps as minutes, hours, and days', () => {
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));

    expect(formatRelativeTime('2026-03-30T11:30:00Z')).toBe('30m ago');
    expect(formatRelativeTime('2026-03-30T09:00:00Z')).toBe('3h ago');
    expect(formatRelativeTime('2026-03-27T12:00:00Z')).toBe('3d ago');
  });

  it('falls back to a formatted date after one week', () => {
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));

    expect(formatRelativeTime('2026-03-01T12:00:00Z')).toBe(
      formatDate('2026-03-01T12:00:00Z')
    );
  });
});

describe('dependency presentation helpers', () => {
  it('maps known dependency types to stable badge, label, and icon values', () => {
    expect(getDependencyTypeColor('docker_image')).toBe('badge-success');
    expect(getDependencyTypeLabel('terraform_provider')).toBe('Terraform Provider');
    expect(getDependencyTypeIcon('github_action')).toBe('Github');
  });

  it('uses fallback values for unknown dependency types', () => {
    expect(getDependencyTypeColor('unknown')).toBe('badge-neutral');
    expect(getDependencyTypeLabel('unknown')).toBe('unknown');
    expect(getDependencyTypeIcon('unknown')).toBe('Package');
  });
});

describe('package metadata helpers', () => {
  it('uses dedicated icons for known managers and a capitalized fallback otherwise', () => {
    expect(getPackageManagerIcon('gomod')).toBe('Go');
    expect(getPackageManagerIcon('bun')).toBe('B');
  });

  it('maps update types to consistent badge colors', () => {
    expect(getUpdateTypeColor('major')).toBe('badge-danger');
    expect(getUpdateTypeColor('pin')).toBe('badge-info');
    expect(getUpdateTypeColor('unexpected')).toBe('badge-neutral');
  });
});

describe('truncate', () => {
  it('keeps short strings intact and appends an ellipsis to long strings', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('hello world', 5)).toBe('hello...');
  });
});
