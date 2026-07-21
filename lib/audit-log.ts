import { recordAuditEvent, type AuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export async function logAudit(event: AuditEvent) {
  const supabase = await createClient();
  await recordAuditEvent(async (payload) => {
    await supabase.from("audit_logs").insert({
      school_id: payload.schoolId,
      actor_user_id: payload.actorUserId,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      metadata: payload.metadata ?? {},
    });
  }, event);
}
