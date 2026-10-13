import { SCHEMA_VERSION, TABLES, type HighNoteDB, type TableName } from './db';

// §5 내보내기/가져오기 + P1-7: 버전·타입·범위·크기 검증 후 한 트랜잭션으로 원자적 반영
export const EXPORT_APP = 'highnote';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface ExportFile {
  app: typeof EXPORT_APP;
  schemaVersion: number;
  exportedAt: number;
  tables: Record<TableName, unknown[]>;
}

export async function exportAll(d: HighNoteDB, now = Date.now()): Promise<ExportFile> {
  const tables = {} as Record<TableName, unknown[]>;
  for (const t of TABLES) tables[t] = await d.table(t).toArray();
  return { app: EXPORT_APP, schemaVersion: SCHEMA_VERSION, exportedAt: now, tables };
}

export class ImportError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, lo = -Infinity, hi = Infinity) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** 표마다 최소 필드·범위를 확인한다 */
const VALIDATORS: Partial<Record<TableName, (r: Record<string, unknown>) => boolean>> = {
  profile: (r) => r.id === 'me' && isObj(r.settings) && num((r.settings as Record<string, unknown>).a4, 430, 450),
  progress: (r) => r.id === 'me' && num(r.xp, 0, 1e9) && num(r.level, 1, 1000),
  rangeTests: (r) => num(r.at) && num(r.lowest, 0, 127) && num(r.comfortMax, 0, 127) && num(r.highestAbs, 0, 127),
  sessions: (r) => num(r.startedAt) && num(r.durationSec, 0, 86400),
  attempts: (r) => num(r.sessionId) && typeof r.game === 'string' && num(r.at),
  notes: (r) => num(r.midi, 0, 127) && (r.state === 'touched' || r.state === 'acquired'),
  quests: (r) => typeof r.id === 'string' && typeof r.date === 'string',
  achievements: (r) => typeof r.id === 'string' && num(r.unlockedAt),
  coach: (r) => num(r.at) && typeof r.text === 'string' && isObj(r.reactions),
  prechecks: (r) => num(r.at),
  stops: (r) => num(r.at) && (r.reason === 'discomfort' || r.reason === 'stop'),
  ceilingLog: (r) => num(r.at) && num(r.to, 0, 127),
};

export function validateExport(raw: unknown): ExportFile {
  if (!isObj(raw) || raw.app !== EXPORT_APP) throw new ImportError('하이노트 내보내기 파일이 아니에요.');
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new ImportError('지원하지 않는 버전의 파일이에요.');
  if (!isObj(raw.tables)) throw new ImportError('파일 형식이 올바르지 않아요.');
  const tables = raw.tables as Record<string, unknown>;
  for (const t of TABLES) {
    const rows = tables[t] ?? [];
    if (!Array.isArray(rows)) throw new ImportError(`${t} 데이터 형식이 올바르지 않아요.`);
    const v = VALIDATORS[t];
    rows.forEach((row, i) => {
      if (!isObj(row) || (v && !v(row))) throw new ImportError(`${t} ${i + 1}번째 항목 값이 올바르지 않아요.`);
    });
    tables[t] = rows;
  }
  return raw as unknown as ExportFile;
}

export function parseImport(text: string): ExportFile {
  if (text.length > MAX_IMPORT_BYTES) throw new ImportError('파일이 너무 커요.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('JSON을 읽을 수 없어요.');
  }
  return validateExport(raw);
}

/** 검증된 파일로 전체 교체. 실패하면 기존 데이터는 그대로 */
export async function importAll(d: HighNoteDB, file: ExportFile): Promise<void> {
  await d.transaction('rw', TABLES.map((t) => d.table(t)), async () => {
    for (const t of TABLES) {
      await d.table(t).clear();
      const rows = file.tables[t] ?? [];
      if (rows.length) await d.table(t).bulkPut(rows);
    }
  });
}

export async function clearAll(d: HighNoteDB): Promise<void> {
  await d.transaction('rw', TABLES.map((t) => d.table(t)), async () => {
    for (const t of TABLES) await d.table(t).clear();
  });
}
