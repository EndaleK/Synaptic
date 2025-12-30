/**
 * Storage Quota Monitoring Utility
 *
 * Provides utilities to:
 * - Check current storage usage and quota
 * - Warn users when approaching storage limits
 * - Clean up stale data from localStorage
 *
 * Browser localStorage limits:
 * - Chrome/Edge: 5MB per origin
 * - Firefox: 5MB per origin
 * - Safari: 5MB per origin (but more restrictive quotas)
 */

export interface StorageEstimate {
  usage: number
  quota: number
  usagePercent: number
  isNearLimit: boolean
  isCritical: boolean
}

export interface StorageItem {
  key: string
  sizeBytes: number
  sizeFormatted: string
}

/**
 * Get current storage usage estimate using Storage API
 * Falls back to localStorage size calculation if Storage API unavailable
 */
export async function getStorageEstimate(): Promise<StorageEstimate> {
  // Try modern Storage API first (more accurate)
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0
      const quota = estimate.quota || 0
      const usagePercent = quota > 0 ? (usage / quota) * 100 : 0

      return {
        usage,
        quota,
        usagePercent,
        isNearLimit: usagePercent > 75,
        isCritical: usagePercent > 90,
      }
    } catch (error) {
      console.warn('[StorageMonitor] Storage API failed, falling back to localStorage calculation:', error)
    }
  }

  // Fallback: Calculate localStorage usage manually
  const localStorageSize = calculateLocalStorageSize()
  const estimatedQuota = 5 * 1024 * 1024 // 5MB - typical browser limit
  const usagePercent = (localStorageSize / estimatedQuota) * 100

  return {
    usage: localStorageSize,
    quota: estimatedQuota,
    usagePercent,
    isNearLimit: usagePercent > 75,
    isCritical: usagePercent > 90,
  }
}

/**
 * Calculate total localStorage size in bytes
 */
export function calculateLocalStorageSize(): number {
  let totalSize = 0

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key) || ''
        // Size = key length + value length (each char is roughly 2 bytes in UTF-16)
        totalSize += (key.length + value.length) * 2
      }
    }
  } catch (error) {
    console.error('[StorageMonitor] Error calculating localStorage size:', error)
  }

  return totalSize
}

/**
 * Get a breakdown of localStorage usage by key
 * Sorted by size descending
 */
export function getStorageBreakdown(): StorageItem[] {
  const items: StorageItem[] = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key) || ''
        const sizeBytes = (key.length + value.length) * 2

        items.push({
          key,
          sizeBytes,
          sizeFormatted: formatBytes(sizeBytes),
        })
      }
    }
  } catch (error) {
    console.error('[StorageMonitor] Error getting storage breakdown:', error)
  }

  return items.sort((a, b) => b.sizeBytes - a.sizeBytes)
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Known localStorage keys that can be safely cleaned up
 * These are typically stale or redundant data
 */
const STALE_KEYS_PATTERNS = [
  /^pomodoroWidget$/,  // Old duplicate Pomodoro key (now consolidated)
  /^document-storage-old$/,  // Old document storage migration
  /^temp_/,  // Temporary data
  /^debug_/,  // Debug data
]

/**
 * Find stale localStorage keys that can be safely removed
 */
export function findStaleKeys(): string[] {
  const staleKeys: string[] = []

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        // Check if key matches any stale pattern
        if (STALE_KEYS_PATTERNS.some(pattern => pattern.test(key))) {
          staleKeys.push(key)
        }
      }
    }
  } catch (error) {
    console.error('[StorageMonitor] Error finding stale keys:', error)
  }

  return staleKeys
}

/**
 * Clean up stale localStorage data
 * Returns the number of bytes freed
 */
export function cleanupStaleData(): { keysRemoved: string[]; bytesFreed: number } {
  const staleKeys = findStaleKeys()
  let bytesFreed = 0
  const keysRemoved: string[] = []

  try {
    for (const key of staleKeys) {
      const value = localStorage.getItem(key) || ''
      bytesFreed += (key.length + value.length) * 2
      localStorage.removeItem(key)
      keysRemoved.push(key)
      console.log(`[StorageMonitor] Removed stale key: ${key}`)
    }
  } catch (error) {
    console.error('[StorageMonitor] Error cleaning up stale data:', error)
  }

  return { keysRemoved, bytesFreed }
}

/**
 * Check storage and log warning if near limit
 * Returns true if storage is healthy, false if near/over limit
 */
export async function checkStorageHealth(): Promise<boolean> {
  const estimate = await getStorageEstimate()

  if (estimate.isCritical) {
    console.error(
      `[StorageMonitor] ⚠️ CRITICAL: Storage usage is at ${estimate.usagePercent.toFixed(1)}%!`,
      `\n  Usage: ${formatBytes(estimate.usage)}`,
      `\n  Quota: ${formatBytes(estimate.quota)}`
    )
    return false
  }

  if (estimate.isNearLimit) {
    console.warn(
      `[StorageMonitor] ⚠️ WARNING: Storage usage is at ${estimate.usagePercent.toFixed(1)}%.`,
      `\n  Usage: ${formatBytes(estimate.usage)}`,
      `\n  Quota: ${formatBytes(estimate.quota)}`,
      '\n  Consider clearing old data.'
    )
    return false
  }

  // Storage is healthy - no need to log in production
  return true
}

/**
 * Hook to monitor storage on page load
 * Call this in your app's root component
 */
export function initStorageMonitor(): void {
  if (typeof window === 'undefined') return

  // Check storage health on load
  checkStorageHealth().then((isHealthy) => {
    if (!isHealthy) {
      // Auto-cleanup stale data if storage is near limit
      cleanupStaleData()
    }
  })

  // Log storage breakdown in development
  if (process.env.NODE_ENV === 'development') {
    const breakdown = getStorageBreakdown()
    console.log('[StorageMonitor] Storage breakdown:', breakdown)
  }
}
