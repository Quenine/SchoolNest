export interface AuditEvent {
  schoolId?: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export type AuditWriter = (event: AuditEvent) => Promise<void>;

/**
 * Central entry point for recording sensitive actions.
 * Inject a server-side writer backed by audit_logs; never call this from a
 * browser with a service-role key.
 */
export async function recordAuditEvent(
  writer: AuditWriter,
  event: AuditEvent,
) {
  await writer(event);
}
