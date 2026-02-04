/**
 * Task Lifecycle Hook Service
 *
 * Fires configured hooks on task state transitions:
 * - onCreated: Task is created
 * - onStarted: Task moves to in-progress
 * - onBlocked: Task moves to blocked
 * - onCompleted: Task moves to done
 * - onArchived: Task is archived
 *
 * Each hook can trigger:
 * - Webhook POST to configured URL
 * - Notification to configured channel
 * - Activity log entry
 *
 * Inspired by BoardKit Orchestrator's hook system.
 */

import { createLogger } from '../lib/logger.js';
import type { Task } from '@veritas-kanban/shared';

const log = createLogger('hooks');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HookEvent = 'onCreated' | 'onStarted' | 'onBlocked' | 'onCompleted' | 'onArchived';

export interface HookConfig {
  enabled?: boolean;
  webhook?: string;
  notify?: boolean;
  logActivity?: boolean;
}

export interface HooksSettings {
  enabled?: boolean;
  onCreated?: HookConfig;
  onStarted?: HookConfig;
  onBlocked?: HookConfig;
  onCompleted?: HookConfig;
  onArchived?: HookConfig;
}

export interface HookPayload {
  event: HookEvent;
  taskId: string;
  taskTitle: string;
  previousStatus?: string;
  newStatus?: string;
  project?: string;
  sprint?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Settings Cache
// ---------------------------------------------------------------------------

let cachedSettings: HooksSettings | undefined;

/**
 * Set the hooks configuration. Called by settings service on load/change.
 */
export function setHooksSettings(settings: HooksSettings | undefined): void {
  cachedSettings = settings;
  log.info({ enabled: settings?.enabled ?? false }, 'Hooks settings updated');
}

/**
 * Get the current hooks configuration.
 */
export function getHooksSettings(): HooksSettings | undefined {
  return cachedSettings;
}

// ---------------------------------------------------------------------------
// Hook Execution
// ---------------------------------------------------------------------------

/**
 * Fire a lifecycle hook for a task event.
 * Non-blocking — errors are logged but don't propagate.
 */
export async function fireHook(
  event: HookEvent,
  task: Pick<Task, 'id' | 'title' | 'status' | 'project' | 'sprint'>,
  previousStatus?: string
): Promise<void> {
  const settings = cachedSettings;

  // Check if hooks are globally enabled
  if (!settings?.enabled) {
    return;
  }

  // Get the specific hook config
  const hookConfig = settings[event];
  if (!hookConfig?.enabled) {
    return;
  }

  const payload: HookPayload = {
    event,
    taskId: task.id,
    taskTitle: task.title,
    previousStatus,
    newStatus: task.status,
    project: task.project,
    sprint: task.sprint,
    timestamp: new Date().toISOString(),
  };

  log.info({ event, taskId: task.id }, 'Firing hook');

  // Fire webhook if configured
  if (hookConfig.webhook) {
    fireWebhook(hookConfig.webhook, payload).catch((err) => {
      log.warn({ event, taskId: task.id, error: err.message }, 'Webhook delivery failed');
    });
  }

  // TODO: Fire notification if configured (integrate with notification-service)
  // if (hookConfig.notify) {
  //   notifyHookEvent(event, payload);
  // }

  // Activity logging is handled by the existing activity service
  // The logActivity flag could be used to suppress logging if needed
}

/**
 * Deliver a webhook payload to the configured URL.
 * Single retry after 2 seconds on failure.
 */
async function fireWebhook(url: string, payload: HookPayload): Promise<void> {
  const body = JSON.stringify(payload);

  const doFetch = async (): Promise<void> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VK-Event': payload.event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  };

  try {
    await doFetch();
    log.debug({ event: payload.event, url }, 'Webhook delivered');
  } catch (err) {
    log.warn(
      { event: payload.event, url, error: (err as Error).message },
      'Webhook failed, retrying in 2s'
    );

    // Single retry after 2 seconds
    setTimeout(async () => {
      try {
        await doFetch();
        log.debug({ event: payload.event, url }, 'Webhook retry succeeded');
      } catch (retryErr) {
        log.error(
          { event: payload.event, url, error: (retryErr as Error).message },
          'Webhook retry failed'
        );
      }
    }, 2000);
  }
}

// ---------------------------------------------------------------------------
// Convenience Functions
// ---------------------------------------------------------------------------

/**
 * Map a status change to the appropriate hook event.
 */
export function getHookEventForStatusChange(
  previousStatus: string | undefined,
  newStatus: string
): HookEvent | null {
  // Status transitions that trigger hooks
  if (newStatus === 'in-progress' && previousStatus !== 'in-progress') {
    return 'onStarted';
  }
  if (newStatus === 'blocked' && previousStatus !== 'blocked') {
    return 'onBlocked';
  }
  if (newStatus === 'done' && previousStatus !== 'done') {
    return 'onCompleted';
  }
  return null;
}
