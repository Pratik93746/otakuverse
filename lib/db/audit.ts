import { getCollection } from '@/lib/mongodb';

export interface AuditEntry {
  /** Verified admin email (or 'system:<source>' for automated actions). */
  actor: string;
  action: string;
  /** What was changed, e.g. an order number or product slug. */
  target?: string;
  /** Small, non-sensitive summary of the change (before/after values). Never put secrets or full PII here. */
  detail?: Record<string, unknown>;
}

/**
 * Append-only record of privileged actions, so the owner can answer "who changed this and when".
 * Also emitted as a structured log line for the log drain.
 * Returns false (and logs loudly) if it could not be stored; callers doing money-moving actions
 * must treat false as a failure.
 */
export async function recordAudit(entry: AuditEntry): Promise<boolean> {
  const doc = { ...entry, at: new Date() };
  console.log(JSON.stringify({ event: 'admin.audit', ...entry, at: doc.at.toISOString() }));
  try {
    const col = await getCollection<any>('auditLog');
    await col.insertOne(doc);
    return true;
  } catch (err) {
    console.error(JSON.stringify({ event: 'admin.audit_failed', action: entry.action, target: entry.target, message: (err as Error)?.message }));
    return false;
  }
}

export async function listAudit(filter: { target?: string } = {}, limit = 100): Promise<any[]> {
  const col = await getCollection<any>('auditLog');
  return await col.find(filter.target ? { target: filter.target } : {}).sort({ at: -1 }).limit(Math.min(limit, 500)).toArray();
}
