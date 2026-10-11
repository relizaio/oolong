import { createHmac, timingSafeEqual } from 'crypto';
import { TeaException } from './errors';

export type SortOrder = 'asc' | 'desc';

export interface PageQuery {
  pageSize?: string;
  pageToken?: string;
  sortField?: string;
  sortOrder?: string;
  idType?: string;
  idValue?: string;
}

export interface TokenState {
  op: string;
  parent: string;
  idType: string;
  idValue: string;
  sortField: string;
  sortOrder: SortOrder;
  pageSize: number;
  index: number;
}

export function assertPageTokenSecret(): string {
  const configured = process.env.PAGE_TOKEN_SECRET;
  if (typeof configured === 'string' && configured.length > 0) {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'PAGE_TOKEN_SECRET must be set when NODE_ENV is production',
    );
  }
  return 'oolong-dev-page-token';
}

function secret(): string {
  return assertPageTokenSecret();
}

export function signToken(state: TokenState): string {
  const body = Buffer.from(JSON.stringify(state)).toString('base64url');
  const mac = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

export function readToken(token: string): TokenState {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new TeaException(400, 'INVALID_PAGE_TOKEN', 'malformed page token');
  }
  const expected = createHmac('sha256', secret())
    .update(parts[0])
    .digest('base64url');
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new TeaException(400, 'INVALID_PAGE_TOKEN', 'malformed page token');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    throw new TeaException(400, 'INVALID_PAGE_TOKEN', 'malformed page token');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new TeaException(400, 'INVALID_PAGE_TOKEN', 'malformed page token');
  }
  const row = parsed as Record<string, unknown>;
  if (
    typeof row.op !== 'string' ||
    typeof row.parent !== 'string' ||
    typeof row.idType !== 'string' ||
    typeof row.idValue !== 'string' ||
    typeof row.sortField !== 'string' ||
    (row.sortOrder !== 'asc' && row.sortOrder !== 'desc') ||
    typeof row.pageSize !== 'number' ||
    typeof row.index !== 'number' ||
    !Number.isInteger(row.pageSize) ||
    !Number.isInteger(row.index) ||
    row.pageSize < 1 ||
    row.pageSize > 100 ||
    row.index < 0
  ) {
    throw new TeaException(400, 'INVALID_PAGE_TOKEN', 'malformed page token');
  }
  return {
    op: row.op,
    parent: row.parent,
    idType: row.idType,
    idValue: row.idValue,
    sortField: row.sortField,
    sortOrder: row.sortOrder,
    pageSize: row.pageSize,
    index: row.index,
  };
}

export function singleQuery(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    throw new TeaException(400, 'INVALID_REQUEST', `duplicate ${name}`);
  }
  if (typeof value !== 'string') {
    throw new TeaException(400, 'INVALID_REQUEST', `invalid ${name}`);
  }
  return value;
}

export function parsePageSize(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return 25;
  }
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid pageSize');
  }
  const n = Number(raw);
  if (n > 100) {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid pageSize');
  }
  return n;
}

export function parseSortOrder(raw: string | undefined): SortOrder {
  if (raw === undefined || raw === '') {
    return 'asc';
  }
  if (raw !== 'asc' && raw !== 'desc') {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid sortOrder');
  }
  return raw;
}

export function parseSortField(
  raw: string | undefined,
  allowed: readonly string[],
  fallback: string,
): string {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  if (!allowed.includes(raw)) {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid sortField');
  }
  return raw;
}

const ID_TYPES = new Set(['CPE', 'TEI', 'PURL', 'COMPLIANCE_DOCUMENT']);

export function parseIdFilter(
  idType: string | undefined,
  idValue: string | undefined,
): { idType: string; idValue: string } | undefined {
  if (idType === undefined && idValue === undefined) {
    return undefined;
  }
  if (idType === '') {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid idType');
  }
  if (idValue === '') {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid idValue');
  }
  if (idType === undefined) {
    throw new TeaException(400, 'INVALID_REQUEST', 'idValue requires idType');
  }
  if (!ID_TYPES.has(idType)) {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid idType');
  }
  return { idType, idValue: idValue ?? '' };
}

export function resolvePage(
  query: PageQuery,
  op: string,
  parent: string,
  allowedSort: readonly string[],
  defaultSort: string,
): TokenState {
  const suppliedSize = parsePageSize(query.pageSize);
  const suppliedOrder = parseSortOrder(query.sortOrder);
  const suppliedField = parseSortField(
    query.sortField,
    allowedSort,
    defaultSort,
  );
  const filter = parseIdFilter(query.idType, query.idValue);
  const idType = filter?.idType ?? '';
  const idValue = filter?.idValue ?? '';
  if (!query.pageToken) {
    return {
      op,
      parent,
      idType,
      idValue,
      sortField: suppliedField,
      sortOrder: suppliedOrder,
      pageSize: suppliedSize,
      index: 0,
    };
  }
  const token = readToken(query.pageToken);
  if (token.op !== op || token.parent !== parent) {
    throw new TeaException(
      400,
      'INVALID_PAGE_TOKEN',
      'page token does not match this request',
    );
  }
  if (query.sortField !== undefined && query.sortField !== token.sortField) {
    throw new TeaException(
      400,
      'INVALID_PAGE_TOKEN',
      'page token does not match this request',
    );
  }
  if (query.sortOrder !== undefined && query.sortOrder !== token.sortOrder) {
    throw new TeaException(
      400,
      'INVALID_PAGE_TOKEN',
      'page token does not match this request',
    );
  }
  if (query.pageSize !== undefined && suppliedSize !== token.pageSize) {
    throw new TeaException(
      400,
      'INVALID_PAGE_TOKEN',
      'page token does not match this request',
    );
  }
  const qType = query.idType ?? '';
  const qValue = query.idValue ?? '';
  if (
    (query.idType !== undefined || query.idValue !== undefined) &&
    (qType !== token.idType || qValue !== token.idValue)
  ) {
    throw new TeaException(
      400,
      'INVALID_PAGE_TOKEN',
      'page token does not match this request',
    );
  }
  return token;
}

export function pageResult<T>(
  items: T[],
  state: TokenState,
): { hasNext: boolean; nextPageToken?: string; results: T[] } {
  if (state.index > items.length) {
    throw new TeaException(
      400,
      'INVALID_PAGE_TOKEN',
      'page token does not match this request',
    );
  }
  const results = items.slice(state.index, state.index + state.pageSize);
  const hasNext = state.index + state.pageSize < items.length;
  if (!hasNext) {
    return { hasNext, results };
  }
  return {
    hasNext,
    nextPageToken: signToken({ ...state, index: state.index + state.pageSize }),
    results,
  };
}

export function cmpStr(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function withOrder(cmp: number, desc: boolean): number {
  return desc ? -cmp : cmp;
}

/** Missing dates sort after populated values in ascending order and before them in descending order. */
export function cmpOptionalDate(
  a: string | undefined,
  b: string | undefined,
  desc: boolean,
): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return desc ? -1 : 1;
  if (b === undefined) return desc ? 1 : -1;
  return withOrder(cmpStr(a, b), desc);
}
