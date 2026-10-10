import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { isHead, TeaException } from './errors';
import type { ArtifactFormat } from './content-store';

export const API_SEMVER = '1.0.0';
export const API_PREFIX = 'v1.0.0';

export function serverHost(): string {
  const raw = process.env.SERVER_HOST || 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export function assertAdvertisedVersion(): void {
  const raw = process.env.API_VERSION;
  if (raw && raw !== '1.0.0' && raw !== 'v1.0.0') {
    throw new Error(`API_VERSION must be 1.0.0 (received ${raw})`);
  }
}

/** Strong entity tag of this HTTP representation. It is not a TEA checksum. */
export function representationEtag(bytes: Buffer): string {
  const hex = createHash('sha256')
    .update(Buffer.concat([Buffer.from('tea-representation-v1\0'), bytes]))
    .digest('hex');
  return `"${hex}"`;
}

function opaqueTag(value: string): string {
  let tag = value.trim();
  if (tag.startsWith('W/')) tag = tag.slice(2).trim();
  if (tag.startsWith('"') && tag.endsWith('"') && tag.length >= 2) {
    tag = tag.slice(1, -1);
  }
  return tag;
}

export function noneMatch(header: string | undefined, etag: string): boolean {
  if (!header) return false;
  const parts = header
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.includes('*')) return true;
  const mine = opaqueTag(etag);
  return parts.some((part) => opaqueTag(part) === mine);
}

interface MediaParts {
  type: string;
  subtype: string;
  params: Map<string, string>;
}

function splitMedia(value: string): MediaParts | undefined {
  const [head, ...rest] = value.split(';');
  const bits = head.trim().toLowerCase().split('/');
  if (bits.length !== 2 || !bits[0] || !bits[1]) return undefined;
  const params = new Map<string, string>();
  for (const piece of rest) {
    const eq = piece.indexOf('=');
    if (eq <= 0) continue;
    const key = piece.slice(0, eq).trim().toLowerCase();
    let param = piece.slice(eq + 1).trim();
    if (param.startsWith('"') && param.endsWith('"'))
      param = param.slice(1, -1);
    if (key === 'q') continue;
    params.set(key, param);
  }
  return { type: bits[0], subtype: bits[1], params };
}

function sameMedia(candidate: string, requested: MediaParts): boolean {
  const format = splitMedia(candidate);
  if (!format) return false;
  if (format.type !== requested.type || format.subtype !== requested.subtype) {
    return false;
  }
  if (requested.params.size === 0) return true;
  for (const [key, value] of requested.params) {
    if (format.params.get(key) !== value) return false;
  }
  return true;
}

export function selectFormat(
  formats: ArtifactFormat[],
  mediaType: string | undefined,
  accept: string | undefined,
): ArtifactFormat {
  if (mediaType !== undefined) {
    const requested = splitMedia(mediaType);
    if (!requested || requested.type === '*') {
      throw new TeaException(406, 'NO_ACCEPTABLE_FORMAT', 'no matching format');
    }
    const found = formats.find((format) =>
      sameMedia(format.mediaType, requested),
    );
    if (!found) {
      throw new TeaException(406, 'NO_ACCEPTABLE_FORMAT', 'no matching format');
    }
    return found;
  }
  if (accept === undefined || accept.trim() === '') return formats[0];
  let best: { format: ArtifactFormat; q: number; index: number } | undefined;
  const ranges = accept.split(',');
  ranges.forEach((range) => {
    const qMatch = /;\s*q=([0-9.]+)/i.exec(range);
    const q = qMatch ? Number(qMatch[1]) : 1;
    if (!Number.isFinite(q) || q <= 0) return;
    const requested = splitMedia(range);
    if (!requested) return;
    formats.forEach((format, formatIndex) => {
      const parts = splitMedia(format.mediaType);
      if (!parts) return;
      const typeOk = requested.type === '*' || requested.type === parts.type;
      const subOk =
        requested.subtype === '*' || requested.subtype === parts.subtype;
      if (!typeOk || !subOk) return;
      if (requested.params.size > 0 && !sameMedia(format.mediaType, requested))
        return;
      if (!best || q > best.q || (q === best.q && formatIndex < best.index)) {
        best = { format, q, index: formatIndex };
      }
    });
  });
  if (!best) {
    throw new TeaException(406, 'NO_ACCEPTABLE_FORMAT', 'no matching format');
  }
  return best.format;
}

/**
 * `Accept` selects the representation whenever `mediaType` is absent, including
 * when only one format exists: a non-matching Accept is 406. RFC 9111 uses Vary
 * on the stored 200 to decide reuse, so that 200 must name Accept.
 * An explicit mediaType fully determines the format and Accept is not consulted.
 */
export function varyFor(mediaType: string | undefined): string | undefined {
  if (mediaType !== undefined) return undefined;
  return 'Accept';
}

export function contentLocation(
  uuid: string,
  version: number,
  kind: 'download' | 'signature',
  mediaType: string,
): string {
  const tail = kind === 'download' ? 'download' : 'signature/download';
  return `${serverHost()}/${API_PREFIX}/artifact/${uuid}/${version}/${tail}?mediaType=${encodeURIComponent(mediaType)}`;
}

export function cacheControl(latest: boolean): string {
  return latest ? 'no-cache' : 'public, max-age=31536000, immutable';
}

export function disposition(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9._-]/g, '') || 'artifact';
  return `attachment; filename="${clean}"`;
}

export function sendBytes(
  req: Request,
  res: Response,
  bytes: Buffer,
  headers: Record<string, string>,
): void {
  const etag = headers.ETag;
  if (etag && noneMatch(req.header('if-none-match'), etag)) {
    res.status(304);
    res.setHeader('ETag', etag);
    if (headers['Content-Location']) {
      res.setHeader('Content-Location', headers['Content-Location']);
    }
    if (headers['Cache-Control']) {
      res.setHeader('Cache-Control', headers['Cache-Control']);
    }
    if (headers.Vary) res.setHeader('Vary', headers.Vary);
    res.end();
    return;
  }
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.setHeader('Content-Length', bytes.length);
  res.status(200);
  if (isHead(req)) {
    res.end();
    return;
  }
  res.end(bytes);
}

export function sendRedirect(res: Response, location: string): void {
  res.status(302);
  res.setHeader('Location', location);
  res.end();
}
