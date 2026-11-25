type WriteResult = { data?: any; error: any };
type WritePayload = Record<string, unknown> | Array<Record<string, unknown>>;
type QueryBuilder = (columns: string) => PromiseLike<{ data: any; error: any }>;
type WriteBuilder = (payload: WritePayload) => PromiseLike<WriteResult>;

const optionalColumns: Record<string, ReadonlySet<string>> = {
  profiles: new Set(['full_name', 'email', 'grade_level', 'notes', 'request_note', 'created_at']),
  courses: new Set(['description', 'schedule_cadence', 'classes_per_week', 'weekly_slots']),
  materials: new Set(['meta_info', 'url', 'storage_path', 'file_name', 'file_size', 'file_type', 'file_url']),
  submissions: new Set([
    'student_id', 'user_id', 'assignment_id', 'status', 'submission_url', 'submission_note',
    'submitted_at', 'grade', 'teacher_feedback', 'storage_path', 'file_name', 'file_size',
    'file_type', 'attachment', 'created_at', 'updated_at', 'file_url', 'pdf_url',
    'graded_file_url', 'graded_file_name', 'graded_at', 'graded_by',
    'review_storage_path', 'review_file_name', 'review_file_size', 'review_file_type'
  ]),
  class_sessions: new Set(['meeting_url']),
  assignments: new Set(['description', 'resource_url', 'resource_label', 'attachment_path', 'attachment_name', 'attachment_size', 'attachment_type', 'file_url', 'file_name']),
  activity_logs: new Set(['details', 'created_at']),
  app_settings: new Set(['live_hero', 'updated_at']),
};

function getMissingColumn(error: unknown) {
  const record = error && typeof error === 'object' ? error as { message?: unknown; details?: unknown; hint?: unknown } : undefined;
  const text = [record?.message, record?.details, record?.hint].filter((value): value is string => typeof value === 'string').join(' ');
  return text.match(/Could not find the ['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"] column/i)?.[1]
    ?? text.match(/column ['\"]?([a-zA-Z_][a-zA-Z0-9_]*)['\"]? does not exist/i)?.[1]
    ?? null;
}

export function isMissingOptionalColumn(error: unknown, table: string, column?: string) {
  const missing = getMissingColumn(error);
  return Boolean(missing && optionalColumns[table]?.has(missing) && (!column || missing === column));
}

export async function selectWithOptionalColumns(table: string, projection: string, build: QueryBuilder) {
  let columns = projection.split(',').map((column) => column.trim()).filter(Boolean);
  while (true) {
    const result = await build(columns.join(','));
    const missing = getMissingColumn(result.error);
    if (!result.error || !missing || !optionalColumns[table]?.has(missing) || !columns.includes(missing)) return result;
    columns = columns.filter((column) => column !== missing);
    console.warn(`[Supabase] Retrying ${table} select without missing optional column "${missing}".`);
  }
}

export async function writeWithOptionalColumns(table: string, payload: WritePayload, build: WriteBuilder): Promise<WriteResult> {
  let currentPayload = payload;
  while (true) {
    const result = await build(currentPayload);
    const missing = getMissingColumn(result.error);
    if (!result.error || !missing || !optionalColumns[table]?.has(missing)) return result;
    const rows = Array.isArray(currentPayload) ? currentPayload : [currentPayload];
    if (!rows.some((row) => Object.hasOwn(row, missing))) return result;
    currentPayload = Array.isArray(currentPayload)
      ? currentPayload.map(({ [missing]: _omitted, ...row }) => row)
      : (({ [missing]: _omitted, ...row }) => row)(currentPayload);
    console.warn(`[Supabase] Retrying ${table} write without missing optional column "${missing}"; that field was not saved.`);
  }
}
