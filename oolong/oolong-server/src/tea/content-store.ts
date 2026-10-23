import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { isSafeSegment, PathGuard } from './path-guard';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const MAX_YAML = 1_000_000;
const MAX_BODY = 32_000_000;

const UPDATE_REASONS = new Set([
  'INITIAL_RELEASE',
  'VEX_UPDATED',
  'ARTIFACT_UPDATED',
  'ARTIFACT_REMOVED',
  'ARTIFACT_ADDED',
]);
const ARTIFACT_TYPES = new Set([
  'ATTESTATION',
  'BOM',
  'BUILD_META',
  'CERTIFICATION',
  'FORMULATION',
  'LICENSE',
  'RELEASE_NOTES',
  'SECURITY_TXT',
  'THREAT_MODEL',
  'VULNERABILITIES',
  'OTHER',
]);
/** Exact lowercase hex length from the pinned `checksum` description. */
const DIGEST_HEX_LENGTH: Record<string, number> = {
  'SHA-1': 40,
  'SHA-256': 64,
  'SHA-384': 96,
  'SHA-512': 128,
  'SHA3-256': 64,
  'SHA3-384': 96,
  'SHA3-512': 128,
  'BLAKE2b-256': 64,
  'BLAKE2b-384': 96,
  'BLAKE2b-512': 128,
  BLAKE3: 64,
};
const ID_TYPES = new Set(['CPE', 'TEI', 'PURL', 'COMPLIANCE_DOCUMENT']);
const COMPLIANCE_VALUES = new Set([
  'SOC_2_TYPE_I',
  'SOC_2_TYPE_II',
  'SOC_3',
  'ISO_27001',
  'ISO_27017',
  'ISO_27018',
  'ISO_27701',
  'ISO_42001',
  'PCI_DSS',
  'HIPAA',
  'FEDRAMP',
  'GDPR',
  'CSA_STAR',
  'NIST_800_53',
  'NIST_800_171',
  'CMMC',
  'HITRUST',
  'TISAX',
  'CYBER_ESSENTIALS',
  'CYBER_ESSENTIALS_PLUS',
  'EU_DECLARATION_OF_CONFORMITY',
]);

export interface Identifier {
  idType: string;
  idValue: string;
}

export interface ComponentRef {
  uuid: string;
  release?: string;
}

export interface Checksum {
  algType: string;
  algValue: string;
}

export interface ArtifactFormat {
  mediaType: string;
  description?: string;
  url?: string;
  signatureUrl?: string;
  checksums?: Checksum[];
}

export interface Artifact {
  uuid: string;
  version: number;
  name?: string;
  type: string;
  createdDate: string;
  distributionIds?: string[];
  formats: ArtifactFormat[];
}

export interface Collection {
  uuid: string;
  version: number;
  createdDate: string;
  belongsTo: 'COMPONENT_RELEASE' | 'PRODUCT_RELEASE';
  updateReason: { type: string; comment?: string };
  artifacts: Artifact[];
}

export interface Product {
  uuid: string;
  name: string;
  identifiers: Identifier[];
}

export interface ProductRelease {
  uuid: string;
  product: string;
  productName?: string;
  version: string;
  createdDate: string;
  releaseDate?: string;
  preRelease?: boolean;
  identifiers?: Identifier[];
  components: ComponentRef[];
}

export interface Component {
  uuid: string;
  name: string;
  identifiers: Identifier[];
}

export interface Distribution {
  distributionId: string;
  /** Publisher label. Not a TEA property; the schema does not forbid it. */
  name?: string;
  description?: string;
  identifiers?: Identifier[];
  url?: string;
  signatureUrl?: string;
  checksums?: Checksum[];
}

export interface ComponentRelease {
  uuid: string;
  component: string;
  componentName?: string;
  version: string;
  createdDate: string;
  releaseDate?: string;
  preRelease?: boolean;
  identifiers?: Identifier[];
  distributions?: Distribution[];
}

interface StoredFormat extends ArtifactFormat {
  bodyFile?: string;
  signatureFile?: string;
}

interface ArtifactRecord {
  meta: Artifact;
  bodies: Map<string, string>;
  signatures: Map<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`);
}

function asString(file: string, value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    fail(file, `${field} must be a string`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return undefined;
  return value;
}

function releaseParentId(
  file: string,
  field: 'product' | 'component',
  declared: unknown,
  enclosingUuid: string,
): string {
  if (declared === undefined || declared === null) {
    return enclosingUuid;
  }
  const parsed = requireUuid(file, declared, field);
  if (parsed !== enclosingUuid) {
    fail(
      file,
      `${field} ${parsed} does not match enclosing ${field} ${enclosingUuid}`,
    );
  }
  return parsed;
}

function requireUuid(file: string, value: unknown, field: string): string {
  const text = asString(file, value, field);
  if (!UUID_RE.test(text)) fail(file, `${field} is not a lowercase UUID`);
  return text;
}

function requireDate(file: string, value: unknown, field: string): string {
  const text = asString(file, value, field);
  if (!DATE_RE.test(text)) fail(file, `${field} must be UTC RFC3339`);
  return text;
}

function optionalDate(
  file: string,
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireDate(file, value, field);
}

function readYaml(guard: PathGuard, file: string): unknown {
  const real = guard.realpathIfInside(file);
  if (!real) return undefined;
  const stat = fs.statSync(real);
  if (!stat.isFile()) return undefined;
  if (stat.size > MAX_YAML) fail(real, 'YAML exceeds size limit');
  const text = fs.readFileSync(real, 'utf8');
  const options = { schema: yaml.JSON_SCHEMA, maxAliasCount: 0 };
  return yaml.load(text, options);
}

function hasUriWhitespace(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127) return true;
  }
  return false;
}

/** RFC 3986 URI. `format: uri` does not restrict the scheme or require the target to resolve. */
export function isUri(value: string): boolean {
  if (value.length === 0 || hasUriWhitespace(value)) return false;
  if (/%(?![0-9A-Fa-f]{2})/.test(value)) return false;
  const schemeEnd = value.indexOf(':');
  if (schemeEnd <= 0) return false;
  const scheme = value.slice(0, schemeEnd);
  if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(scheme)) return false;
  return /^[A-Za-z0-9\-._~:/?#@!$&'()*+,;=%[\]]+$/.test(value);
}

function optionalUri(
  file: string,
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !isUri(value)) {
    fail(file, `${field} must be a URI`);
  }
  return value;
}

function requireChecksum(file: string, value: unknown): Checksum {
  if (!isRecord(value)) fail(file, 'checksum must be an object');
  const algType = asString(file, value.algType, 'algType');
  const expected = DIGEST_HEX_LENGTH[algType];
  if (expected === undefined) fail(file, `unknown checksum ${algType}`);
  const algValue = value.algValue;
  if (
    typeof algValue !== 'string' ||
    algValue.length !== expected ||
    !/^[0-9a-f]+$/.test(algValue)
  ) {
    fail(
      file,
      `algValue for ${algType} must be ${expected} lowercase hex characters`,
    );
  }
  return { algType, algValue };
}

function requireChecksums(file: string, value: unknown): Checksum[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(file, 'checksums must be a non-empty array');
  }
  return value.map((item) => requireChecksum(file, item));
}

function identifiers(
  file: string,
  value: unknown,
  required: boolean,
  compliance: 'allowed' | 'forbidden',
): Identifier[] | undefined {
  if (value === undefined) {
    if (required) fail(file, 'identifiers is required');
    return undefined;
  }
  if (!Array.isArray(value)) fail(file, 'identifiers must be an array');
  return value.map((item) => {
    if (!isRecord(item)) fail(file, 'identifier must be an object');
    const idType = asString(file, item.idType, 'idType');
    const idValue = asString(file, item.idValue, 'idValue');
    if (!ID_TYPES.has(idType)) fail(file, `unknown idType ${idType}`);
    if (idType === 'COMPLIANCE_DOCUMENT') {
      if (compliance === 'forbidden') {
        fail(file, 'COMPLIANCE_DOCUMENT is not valid on this object');
      }
      if (!COMPLIANCE_VALUES.has(idValue)) {
        fail(file, 'COMPLIANCE_DOCUMENT idValue is not a known type');
      }
    }
    return { idType, idValue };
  });
}

function walkFiles(
  guard: PathGuard,
  dir: string,
  name: string,
  out: string[],
  visited?: Set<string>,
): void {
  const realDir = guard.realpathIfInside(dir);
  if (!realDir) return;
  const seen = visited ?? new Set<string>();
  if (seen.has(realDir)) return;
  seen.add(realDir);
  const dirStat = fs.statSync(realDir);
  if (!dirStat.isDirectory()) return;
  for (const ent of fs.readdirSync(realDir, { withFileTypes: true })) {
    if (!isSafeSegment(ent.name)) continue;
    const full = path.join(realDir, ent.name);
    if (ent.isSymbolicLink()) {
      const target = guard.realpathIfInside(full);
      if (!target) continue;
      const st = fs.statSync(target);
      if (st.isDirectory()) walkFiles(guard, target, name, out, seen);
      else if (st.isFile() && ent.name === name) out.push(target);
      continue;
    }
    if (ent.isDirectory()) walkFiles(guard, full, name, out, seen);
    else if (ent.isFile() && ent.name === name) out.push(full);
  }
}

export function contentRoot(): string {
  if (process.env.CONTENT_DIR) return path.resolve(process.env.CONTENT_DIR);
  return path.resolve(process.cwd(), '../fixtures/tea-1.0.0');
}

export class ContentStore {
  readonly guard: PathGuard;
  readonly products = new Map<string, Product>();
  readonly productReleases = new Map<string, ProductRelease>();
  readonly releasesByProduct = new Map<string, ProductRelease[]>();
  readonly components = new Map<string, Component>();
  readonly componentReleases = new Map<string, ComponentRelease>();
  readonly releasesByComponent = new Map<string, ComponentRelease[]>();
  readonly collections = new Map<string, Collection[]>();
  readonly artifacts = new Map<string, Map<number, ArtifactRecord>>();

  constructor(root = contentRoot()) {
    this.guard = new PathGuard(root);
    this.loadProducts();
    this.loadComponents();
    for (const uuid of this.productReleases.keys()) {
      if (this.componentReleases.has(uuid)) {
        fail(root, 'product release uuid also identifies a component release');
      }
    }
    this.loadArtifacts();
    this.loadCollections('products', 'PRODUCT_RELEASE');
    this.loadCollections('components', 'COMPONENT_RELEASE');
  }

  productReleaseView(
    release: ProductRelease,
  ): ProductRelease & { latestCollection: Collection } {
    return {
      ...release,
      latestCollection: this.latestCollection(
        release.uuid,
        'PRODUCT_RELEASE',
        release.createdDate,
      ),
    };
  }

  componentReleaseView(
    release: ComponentRelease,
  ): ComponentRelease & { latestCollection: Collection } {
    return {
      ...release,
      latestCollection: this.latestCollection(
        release.uuid,
        'COMPONENT_RELEASE',
        release.createdDate,
      ),
    };
  }

  collectionsFor(
    uuid: string,
    belongsTo: Collection['belongsTo'],
    createdDate: string,
  ): Collection[] {
    const found = this.collections.get(uuid);
    if (found && found.length > 0) return found;
    return [this.synthetic(uuid, belongsTo, createdDate)];
  }

  collectionVersion(
    uuid: string,
    version: number,
    belongsTo: Collection['belongsTo'],
    createdDate: string,
  ): Collection | undefined {
    const all = this.collectionsFor(uuid, belongsTo, createdDate);
    return all.find((item) => item.version === version);
  }

  latestCollection(
    uuid: string,
    belongsTo: Collection['belongsTo'],
    createdDate: string,
  ): Collection {
    const all = this.collectionsFor(uuid, belongsTo, createdDate);
    return all[all.length - 1];
  }

  artifact(uuid: string, version: number): ArtifactRecord | undefined {
    return this.artifacts.get(uuid)?.get(version);
  }

  latestArtifact(uuid: string): ArtifactRecord | undefined {
    const versions = this.artifacts.get(uuid);
    if (!versions || versions.size === 0) return undefined;
    const max = Math.max(...versions.keys());
    return versions.get(max);
  }

  readBody(file: string): Buffer {
    const real = this.guard.realpathIfInside(file);
    if (!real) throw new Error('artifact body escaped the content root');
    const stat = fs.statSync(real);
    if (!stat.isFile() || stat.size > MAX_BODY) {
      throw new Error('artifact body is missing or too large');
    }
    return fs.readFileSync(real);
  }

  private synthetic(
    uuid: string,
    belongsTo: Collection['belongsTo'],
    createdDate: string,
  ): Collection {
    return {
      uuid,
      version: 1,
      createdDate,
      belongsTo,
      updateReason: { type: 'INITIAL_RELEASE' },
      artifacts: [],
    };
  }

  private loadProducts(): void {
    const dir = path.join(this.guard.root, 'products');
    const files: string[] = [];
    walkFiles(this.guard, dir, 'product.yaml', files);
    for (const file of files) {
      const raw = readYaml(this.guard, file);
      if (!isRecord(raw)) fail(file, 'product yaml must be an object');
      const product: Product = {
        uuid: requireUuid(file, raw.uuid, 'uuid'),
        name: asString(file, raw.name, 'name'),
        identifiers:
          identifiers(file, raw.identifiers, true, 'forbidden') ?? [],
      };
      if (this.products.has(product.uuid)) fail(file, 'duplicate product uuid');
      this.products.set(product.uuid, product);
      const releaseFiles: string[] = [];
      walkFiles(
        this.guard,
        path.join(path.dirname(file), 'releases'),
        'release.yaml',
        releaseFiles,
      );
      const releases: ProductRelease[] = [];
      for (const releaseFile of releaseFiles) {
        const release = this.readProductRelease(releaseFile, product);
        if (this.productReleases.has(release.uuid))
          fail(releaseFile, 'duplicate product release uuid');
        this.productReleases.set(release.uuid, release);
        releases.push(release);
      }
      this.releasesByProduct.set(product.uuid, releases);
    }
  }

  private readProductRelease(file: string, product: Product): ProductRelease {
    const raw = readYaml(this.guard, file);
    if (!isRecord(raw)) fail(file, 'release yaml must be an object');
    const components = Array.isArray(raw.components)
      ? raw.components
      : fail(file, 'components is required');
    return {
      uuid: requireUuid(file, raw.uuid, 'uuid'),
      product: releaseParentId(file, 'product', raw.product, product.uuid),
      productName: optionalString(raw.productName) ?? product.name,
      version: asString(file, raw.version, 'version'),
      createdDate: requireDate(file, raw.createdDate, 'createdDate'),
      releaseDate: optionalDate(file, raw.releaseDate, 'releaseDate'),
      // Optional. A non-boolean is omitted so the response stays schema-valid.
      preRelease:
        typeof raw.preRelease === 'boolean' ? raw.preRelease : undefined,
      identifiers: identifiers(file, raw.identifiers, false, 'forbidden'),
      components: components.map((item) => {
        if (!isRecord(item)) fail(file, 'component ref must be an object');
        const ref: ComponentRef = {
          uuid: requireUuid(file, item.uuid, 'components.uuid'),
        };
        if (item.release !== undefined)
          ref.release = requireUuid(file, item.release, 'components.release');
        return ref;
      }),
    };
  }

  private loadComponents(): void {
    const dir = path.join(this.guard.root, 'components');
    const files: string[] = [];
    walkFiles(this.guard, dir, 'component.yaml', files);
    for (const file of files) {
      const raw = readYaml(this.guard, file);
      if (!isRecord(raw)) fail(file, 'component yaml must be an object');
      const component: Component = {
        uuid: requireUuid(file, raw.uuid, 'uuid'),
        name: asString(file, raw.name, 'name'),
        identifiers: identifiers(file, raw.identifiers, true, 'allowed') ?? [],
      };
      if (this.components.has(component.uuid))
        fail(file, 'duplicate component uuid');
      this.components.set(component.uuid, component);
      const releaseFiles: string[] = [];
      walkFiles(
        this.guard,
        path.join(path.dirname(file), 'releases'),
        'release.yaml',
        releaseFiles,
      );
      const releases: ComponentRelease[] = [];
      for (const releaseFile of releaseFiles) {
        const release = this.readComponentRelease(releaseFile, component);
        if (this.componentReleases.has(release.uuid))
          fail(releaseFile, 'duplicate component release uuid');
        this.componentReleases.set(release.uuid, release);
        releases.push(release);
      }
      this.releasesByComponent.set(component.uuid, releases);
    }
  }

  private readComponentRelease(
    file: string,
    component: Component,
  ): ComponentRelease {
    const raw = readYaml(this.guard, file);
    if (!isRecord(raw)) fail(file, 'release yaml must be an object');
    let distributions: ComponentRelease['distributions'];
    if (raw.distributions !== undefined) {
      if (!Array.isArray(raw.distributions))
        fail(file, 'distributions must be an array');
      distributions = raw.distributions.map((item) => {
        if (!isRecord(item)) fail(file, 'distribution must be an object');
        const distribution: Distribution = {
          distributionId: requireUuid(
            file,
            item.distributionId,
            'distributionId',
          ),
        };
        const name = optionalString(item.name);
        if (name !== undefined) distribution.name = name;
        const description = optionalString(item.description);
        if (description !== undefined) distribution.description = description;
        const distributionIds = identifiers(
          file,
          item.identifiers,
          false,
          'forbidden',
        );
        if (distributionIds !== undefined) {
          distribution.identifiers = distributionIds;
        }
        const url = optionalUri(file, item.url, 'url');
        if (url !== undefined) distribution.url = url;
        const signatureUrl = optionalUri(
          file,
          item.signatureUrl,
          'signatureUrl',
        );
        if (signatureUrl !== undefined)
          distribution.signatureUrl = signatureUrl;
        if (item.checksums !== undefined) {
          distribution.checksums = requireChecksums(file, item.checksums);
        }
        return distribution;
      });
    }
    return {
      uuid: requireUuid(file, raw.uuid, 'uuid'),
      component: releaseParentId(
        file,
        'component',
        raw.component,
        component.uuid,
      ),
      componentName: optionalString(raw.componentName) ?? component.name,
      version: asString(file, raw.version, 'version'),
      createdDate: requireDate(file, raw.createdDate, 'createdDate'),
      releaseDate: optionalDate(file, raw.releaseDate, 'releaseDate'),
      // Optional. A non-boolean is omitted so the response stays schema-valid.
      preRelease:
        typeof raw.preRelease === 'boolean' ? raw.preRelease : undefined,
      identifiers: identifiers(file, raw.identifiers, false, 'allowed'),
      distributions,
    };
  }

  private loadArtifacts(): void {
    const dir = path.join(this.guard.root, 'artifacts');
    const real = this.guard.realpathIfInside(dir);
    if (!real) return;
    for (const ent of fs.readdirSync(real, { withFileTypes: true })) {
      if (!UUID_RE.test(ent.name)) continue;
      const uuidDir = this.guard.child(real, ent.name);
      if (!uuidDir) continue;
      const uuidReal = this.guard.realpathIfInside(uuidDir);
      if (!uuidReal) continue;
      for (const rev of fs.readdirSync(uuidReal, { withFileTypes: true })) {
        if (!rev.isFile() || !/^v[1-9]\d*\.yaml$/.test(rev.name)) continue;
        const file = path.join(uuidReal, rev.name);
        this.readArtifact(file, ent.name);
      }
    }
  }

  private readArtifact(file: string, dirUuid: string): void {
    const raw = readYaml(this.guard, file);
    if (!isRecord(raw)) fail(file, 'artifact yaml must be an object');
    const uuid = requireUuid(file, raw.uuid, 'uuid');
    if (uuid !== dirUuid)
      fail(file, 'artifact uuid does not match its directory');
    if (
      typeof raw.version !== 'number' ||
      !Number.isInteger(raw.version) ||
      raw.version < 1
    ) {
      fail(file, 'version must be an integer >= 1');
    }
    const type = asString(file, raw.type, 'type');
    if (!ARTIFACT_TYPES.has(type)) fail(file, `unknown artifact type ${type}`);
    if (!Array.isArray(raw.formats) || raw.formats.length === 0)
      fail(file, 'formats is required');
    const bodies = new Map<string, string>();
    const signatures = new Map<string, string>();
    const formats: ArtifactFormat[] = raw.formats.map((item) => {
      if (!isRecord(item)) fail(file, 'format must be an object');
      const mediaType = asString(file, item.mediaType, 'mediaType');
      const stored: StoredFormat = {
        mediaType,
        description: optionalString(item.description),
        url: optionalUri(file, item.url, 'url'),
        signatureUrl: optionalUri(file, item.signatureUrl, 'signatureUrl'),
      };
      if (item.checksums !== undefined) {
        stored.checksums = requireChecksums(file, item.checksums);
      }
      if (stored.url && !stored.checksums) fail(file, 'url requires checksums');
      const bodyName = optionalString(item.bodyFile);
      if (bodyName) {
        const body = this.guard.child(path.dirname(file), bodyName);
        const realBody = body ? this.guard.realpathIfInside(body) : null;
        if (!realBody) fail(file, 'bodyFile escapes the content root');
        bodies.set(mediaType, realBody);
      }
      const sigName = optionalString(item.signatureFile);
      if (sigName) {
        const sig = this.guard.child(path.dirname(file), sigName);
        const realSig = sig ? this.guard.realpathIfInside(sig) : null;
        if (!realSig) fail(file, 'signatureFile escapes the content root');
        signatures.set(mediaType, realSig);
      }
      const published: ArtifactFormat = { mediaType };
      if (stored.description) published.description = stored.description;
      if (stored.url) published.url = stored.url;
      if (stored.signatureUrl) published.signatureUrl = stored.signatureUrl;
      if (stored.checksums) published.checksums = stored.checksums;
      return published;
    });
    const seenMedia = new Set<string>();
    for (const format of formats) {
      if (seenMedia.has(format.mediaType)) {
        fail(file, 'mediaType must be unique within an artifact revision');
      }
      seenMedia.add(format.mediaType);
    }
    let distributionIds: string[] | undefined;
    if (raw.distributionIds !== undefined) {
      if (!Array.isArray(raw.distributionIds))
        fail(file, 'distributionIds must be an array');
      distributionIds = raw.distributionIds.map((item) =>
        requireUuid(file, item, 'distributionIds'),
      );
      if (distributionIds.length === 0) distributionIds = undefined;
    }
    const meta: Artifact = {
      uuid,
      version: raw.version,
      type,
      createdDate: requireDate(file, raw.createdDate, 'createdDate'),
      formats,
    };
    const name = optionalString(raw.name);
    if (name) meta.name = name;
    if (distributionIds) meta.distributionIds = distributionIds;
    const series =
      this.artifacts.get(uuid) ?? new Map<number, ArtifactRecord>();
    if (series.has(meta.version)) fail(file, 'duplicate artifact revision');
    series.set(meta.version, { meta, bodies, signatures });
    this.artifacts.set(uuid, series);
  }

  private loadCollections(
    kind: 'products' | 'components',
    belongsTo: Collection['belongsTo'],
  ): void {
    const root = path.join(this.guard.root, kind);
    const files: string[] = [];
    walkFiles(this.guard, root, 'release.yaml', files);
    for (const releaseFile of files) {
      const rawRelease = readYaml(this.guard, releaseFile);
      if (!isRecord(rawRelease)) continue;
      const uuid = requireUuid(releaseFile, rawRelease.uuid, 'uuid');
      const collectionsDir = path.join(
        path.dirname(releaseFile),
        'collections',
      );
      const real = this.guard.realpathIfInside(collectionsDir);
      if (!real) continue;
      const loaded: Collection[] = [];
      for (const ent of fs.readdirSync(real, { withFileTypes: true })) {
        if (!ent.isFile() || !/^[1-9]\d*\.yaml$/.test(ent.name)) continue;
        const file = path.join(real, ent.name);
        loaded.push(this.readCollection(file, uuid, belongsTo));
      }
      loaded.sort((a, b) => a.version - b.version);
      if (loaded.length > 0) this.collections.set(uuid, loaded);
    }
  }

  private readCollection(
    file: string,
    releaseUuid: string,
    belongsTo: Collection['belongsTo'],
  ): Collection {
    const raw = readYaml(this.guard, file);
    if (!isRecord(raw)) fail(file, 'collection yaml must be an object');
    if (
      typeof raw.version !== 'number' ||
      !Number.isInteger(raw.version) ||
      raw.version < 1
    ) {
      fail(file, 'version must be an integer >= 1');
    }
    const expectedName = `${raw.version}.yaml`;
    if (path.basename(file) !== expectedName)
      fail(file, 'collection filename must match version');
    if (!isRecord(raw.updateReason)) fail(file, 'updateReason is required');
    const reasonType = asString(
      file,
      raw.updateReason.type,
      'updateReason.type',
    );
    if (!UPDATE_REASONS.has(reasonType))
      fail(file, `unknown update reason ${reasonType}`);
    const fileBelongs = optionalString(raw.belongsTo) ?? belongsTo;
    if (fileBelongs !== belongsTo)
      fail(file, 'belongsTo does not match the parent');
    if (!Array.isArray(raw.artifacts)) fail(file, 'artifacts must be an array');
    const artifacts = raw.artifacts.map((item) => {
      if (!isRecord(item)) fail(file, 'artifact ref must be an object');
      const uuid = requireUuid(file, item.uuid, 'artifacts.uuid');
      if (typeof item.version !== 'number' || !Number.isInteger(item.version)) {
        fail(file, 'artifacts.version must be an integer');
      }
      const record = this.artifact(uuid, item.version);
      if (!record)
        fail(file, `missing artifact ${uuid} version ${item.version}`);
      return record.meta;
    });
    const updateReason: Collection['updateReason'] = { type: reasonType };
    const comment = optionalString(raw.updateReason.comment);
    if (comment) updateReason.comment = comment;
    return {
      uuid: releaseUuid,
      version: raw.version,
      createdDate: requireDate(file, raw.createdDate, 'createdDate'),
      belongsTo,
      updateReason,
      artifacts,
    };
  }
}
