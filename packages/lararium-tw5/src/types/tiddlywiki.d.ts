/**
 * Ambient type shim for TiddlyWiki5 v5.4.x — local-authoritative schema.
 *
 * **Coexistence with `tw5-typed`:**
 *
 * As of E.10.10, `tw5-typed` (linonetwo / tiddly-gittly) ships as a dev
 * dep and lives in `tsconfig.json::types`. It exports types under
 * upstream-canonical names (`Widget`, `ITiddlyWiki`, `IParseTreeNode`,
 * etc.) inside `declare module 'tiddlywiki'`. Our hand-rolled types
 * here use a `TW5*` prefix and coexist without collision — different
 * interface names, two parallel type graphs.
 *
 * **Why both:**
 *   - tw5-typed is broader and stricter; tracking upstream changes
 *     gives us future-friendliness AND surfaces canonical types for
 *     NEW code (e.g. Path V plugin packaging imports directly from
 *     `'tiddlywiki'`).
 *   - The hand-rolled types here model exactly what our existing call
 *     sites use, including domain-specific shapes (filter operator
 *     `operand`/`suffix` access, `_larKukaliHook` extension slot) that
 *     tw5-typed's stricter coverage doesn't expose. A cold migration
 *     would force ~30 minutes of churn across 12 sites.
 *
 * **Migration path:**
 *   - NEW code prefers tw5-typed names directly:
 *       `import type { Widget } from 'tiddlywiki';`
 *   - EXISTING code uses local `TW5*` aliases until the call site is
 *     touched naturally; switch the import at that time.
 *   - As file-by-file migrations land, the types in this file shrink.
 *     Eventually only domain-specific extensions remain — and those
 *     migrate to declaration-merging blocks per linonetwo's README:
 *       `declare module 'tiddlywiki' { interface ITiddlyWiki { ... } }`
 *
 * **Authoring notes (local schema):**
 *   - TW5 is fully dynamic at runtime; types here are precise where TW5
 *     contracts are stable, permissive (unknown/Record) where they are not.
 *   - TW5WidgetInstance is an interface, not a class — widgets are wired via
 *     prototype chain, not ES6 class extends. Constructors are typed separately.
 *   - Filter `source` is the TW5 iterator protocol: a function that accepts a
 *     callback receiving (tiddler | undefined, title) for each input tiddler.
 *   - TW5Wiki carries an optional extension slot (_larKukaliHook) written by
 *     LarariumTW5.registerKukaliHook() so KukaliWidget can read it without a cast.
 */

import type {
  ITW5TiddlerInputFields,
  TW5TiddlerInputFields,
  ITW5TiddlerFields,
  TW5TiddlerFields,
} from "@lararium/mesh";
export type {
  ITW5TiddlerInputFields,
  TW5TiddlerInputFields,
  ITW5TiddlerFields,
  TW5TiddlerFields,
} from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Parse tree nodes (produced by parsers, consumed by widget engine)
// ---------------------------------------------------------------------------

export type TW5AttributeType =
  | "string"
  | "indirect"
  | "macro"
  | "substituted"
  | "filtered";

export interface TW5AttributeValue {
  type:           TW5AttributeType;
  value?:         string;
  textReference?: string;
  rawValue?:      string;
  filter?:        string;
  macro?:         Record<string, unknown>;
  isPositional?:  boolean;
}

export interface TW5ParseTreeNode {
  type:               string;
  tag?:               string;
  text?:              string;
  attributes?:        Record<string, TW5AttributeValue>;
  orderedAttributes?: Array<{ name: string } & TW5AttributeValue>;
  children?:          TW5ParseTreeNode[];
  isBlock?:           boolean;
  isNotRemappable?:   boolean;
  [prop: string]:     unknown;
}

export interface TW5Tiddler {
  readonly fields: Readonly<TW5TiddlerFields>;
  readonly cache:  Record<string, unknown>;

  hasField(field: string): boolean;
  isEqual(tiddler: TW5Tiddler, excludeFields?: string[]): boolean;
  getFieldString(field: string, defaultValue?: string): string;
  getFieldList(field: string): string[];
  getFieldStrings(options?: { exclude?: string[] }): Record<string, string>;
  getFieldStringBlock(options?: { exclude?: string[] }): string;
  getFieldDay(field: string): number;
  hasTag(tag: string): boolean;
  isPlugin(): boolean;
  isDraft(): boolean;
}

/** Constructor for `new tw.Tiddler(fields?, ...mergeFields)`. */
export interface TW5TiddlerConstructor {
  new (...fieldObjects: Array<TW5TiddlerInputFields | Record<string, unknown>>): TW5Tiddler;
  prototype: TW5Tiddler;
}

// ---------------------------------------------------------------------------
// Filter engine — source iterator protocol
// ---------------------------------------------------------------------------

/** TW5 filter source: iterate input tiddlers by invoking callback for each. */
export type TW5FilterSource = (
  fn: (tiddler: TW5Tiddler | undefined, title: string) => void,
) => void;

export interface TW5FilterOperandSpec {
  text:                   string;
  indirect?:              boolean;
  variable?:              boolean;
  multiValuedVariable?:   boolean;
  value?:                 string;
  multiValue?:            string[];
}

export interface TW5FilterOperator {
  operator:   string;
  operands:   TW5FilterOperandSpec[];
  /** The resolved single operand text (first operand). */
  operand:    string;
  prefix?:    string;
  suffix?:    string;
  suffixes?:  string[][];
  negate?:    boolean;
}

export interface TW5FilterRunSpec {
  prefix?:       string;
  namedPrefix?:  string;
  suffixes?:     string[][];
  operators:     TW5FilterOperator[];
}

export type TW5FilterOperatorFn = (
  source:   TW5FilterSource,
  operator: TW5FilterOperator,
  options:  { wiki: TW5Wiki; widget?: TW5WidgetInstance },
) => string[];

export type TW5CompiledFilter = (
  source:  TW5FilterSource,
  widget?: TW5WidgetInstance,
) => string[];

// ---------------------------------------------------------------------------
// Change record (wiki "change" event payload)
// ---------------------------------------------------------------------------

export interface TW5ChangeRecord {
  modified?: boolean;
  deleted?:  boolean;
  normal?:   boolean;
  shadow?:   boolean;
}

// ---------------------------------------------------------------------------
// Fake DOM (TW5 server-side document shim)
// ---------------------------------------------------------------------------

export interface TW5FakeElement {
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  appendChild(child: TW5FakeElement): void;
  removeChild(child: TW5FakeElement): void;
  insertBefore(newNode: TW5FakeElement, referenceNode: TW5FakeElement | null): void;
  textContent:    string | null;
  innerHTML:      string;
  style:          Record<string, string>;
  className:      string;
  tagName:        string;
  childNodes:     TW5FakeElement[];
  parentNode:     TW5FakeElement | null;
  [prop: string]: unknown;
}

export interface TW5FakeDocument {
  createElement(tag: string): TW5FakeElement;
  createTextNode(text: string): TW5FakeElement;
  createElementNS(ns: string, tag: string): TW5FakeElement;
  body:           TW5FakeElement;
  head:           TW5FakeElement;
  [prop: string]: unknown;
}

// ---------------------------------------------------------------------------
// Wiki (static class)
// ---------------------------------------------------------------------------

export interface TW5WikiStatic {
  new (options?: { enableIndexers?: string[] }): TW5Wiki;
  prototype: TW5Wiki;

  /** Parser registry keyed by MIME type. */
  parsers: Record<string, unknown>;

  /** Tiddler deserializer registry keyed by MIME type. */
  tiddlerDeserializerModules: Record<
    string,
    (text: string, fields: Record<string, unknown>) => TW5TiddlerInputFields[]
  >;
}

// ---------------------------------------------------------------------------
// Wiki (instance)
// ---------------------------------------------------------------------------

export interface TW5Wiki {
  // ── Tiddler CRUD ────────────────────────────────────────────────────────

  addTiddler(tiddler: TW5Tiddler | TW5TiddlerInputFields | Record<string, unknown>): void;
  deleteTiddler(title: string): void;
  getTiddler(title: string): TW5Tiddler | undefined;
  tiddlerExists(title: string): boolean;

  // ── Iteration ───────────────────────────────────────────────────────────

  each(callback: (tiddler: TW5Tiddler, title: string) => void): void;
  allTitles(): string[];
  getTiddlers(options?: {
    sortField?:      string;
    excludeTag?:     string;
    includeSystem?:  boolean;
  }): string[];
  forEachTiddler(
    options:  { sortField?: string; includeSystem?: boolean } | ((tiddler: TW5Tiddler, title: string) => void),
    callback?: (tiddler: TW5Tiddler, title: string) => void,
  ): void;
  eachTiddlerPlusShadows(callback: (tiddler: TW5Tiddler, title: string) => void): void;
  eachShadowPlusTiddlers(callback: (tiddler: TW5Tiddler, title: string) => void): void;
  countTiddlers(excludeTag?: string): number;

  // ── Shadow tiddlers ──────────────────────────────────────────────────────

  isShadowTiddler(title: string): boolean;
  allShadowTitles(): string[];
  eachShadow(callback: (tiddler: TW5Tiddler, title: string) => void): void;
  getShadowSource(title: string): string | null;

  // ── Batch / transaction (TW5 5.3+) ──────────────────────────────────────

  transact(fn: () => void): void;

  // ── Tiddler text / field helpers ─────────────────────────────────────────

  getTiddlerText(title: string, defaultText?: string): string | undefined;
  getTiddlerData(title: string, defaultData?: unknown): unknown;
  setTiddlerData(title: string, data: unknown, fields?: TW5TiddlerInputFields, options?: { suppressTimestamp?: boolean }): void;
  getTiddlerDataCached(title: string, defaultData?: unknown): unknown;
  getTiddlerAsJson(title: string): string;
  getTiddlersAsJson(filter: string, spaces?: number): string;

  // ── Field generation ─────────────────────────────────────────────────────

  getCreationFields(): Partial<TW5TiddlerInputFields>;
  getModificationFields(): Partial<TW5TiddlerInputFields>;

  // ── Title helpers ─────────────────────────────────────────────────────────

  isSystemTiddler(title: string): boolean;
  isTemporaryTiddler(title: string): boolean;
  isVolatileTiddler(title: string): boolean;
  isImageTiddler(title: string): boolean | null;
  isBinaryTiddler(title: string): boolean | null;
  generateNewTitle(baseTitle: string, options?: {
    prefix?:     string;
    template?:   string;
    startCount?: number;
  }): string;

  // ── Text references ──────────────────────────────────────────────────────

  getTextReference(ref: string, defaultText?: string, currTiddlerTitle?: string): string;
  setTextReference(ref: string, value: string, currTiddlerTitle?: string): void;
  setText(title: string, field?: string, index?: string, value?: string, options?: { suppressTimestamp?: boolean }): void;
  deleteTextReference(ref: string, currTiddlerTitle?: string): void;

  // ── Filter engine ─────────────────────────────────────────────────────────

  filterTiddlers(filterExpr: string, widget?: TW5WidgetInstance, source?: TW5FilterSource): string[];
  /** Build a filter source iterator over an explicit title list. */
  makeTiddlerIterator(titles: string[]): TW5FilterSource;
  compileFilter(filterExpr: string): TW5CompiledFilter;
  parseFilter(filterExpr: string): TW5FilterRunSpec[];

  // ── Render ────────────────────────────────────────────────────────────────

  renderText(
    outputType: string,
    textType:   string,
    text:       string,
    options?:   Record<string, unknown>,
  ): string;

  renderTiddler(
    outputType: string,
    title:      string,
    options?:   Record<string, unknown>,
  ): string;

  makeWidget(
    parser:   object,
    options?: {
      document?:     TW5FakeDocument;
      parentWidget?: TW5WidgetInstance;
      variables?:    Record<string, string>;
    },
  ): TW5WidgetInstance;

  makeTranscludeWidget(
    title:   string,
    options: {
      /** Accepts TW5FakeDocument (server/stylesheet) or real browser Document. */
      document:         TW5FakeDocument | object;
      parentWidget?:    TW5WidgetInstance | null;
      field?:           string;
      mode?:            "inline" | "block";
      recursionMarker?: string;
    },
  ): TW5WidgetInstance;

  // ── Parser ────────────────────────────────────────────────────────────────

  parseText(
    type:     string,
    text:     string,
    options?: {
      parseAsInline?:        boolean;
      configTrimWhiteSpace?: boolean;
      _canonical_uri?:       string;
    },
  ): { tree: TW5ParseTreeNode[] };

  // ── Deserializer ──────────────────────────────────────────────────────────

  deserializeTiddlers(
    type:     string,
    text:     string,
    fields?:  Record<string, unknown>,
    options?: Record<string, unknown>,
  ): TW5TiddlerInputFields[];

  // ── Links and transclusions ──────────────────────────────────────────────

  getTiddlerLinks(title: string): string[];
  getTiddlerBacklinks(targetTitle: string): string[];
  getTiddlerTranscludes(title: string): string[];
  getTiddlerBacktranscludes(targetTitle: string): string[];
  extractLinks(parseTreeRoot: TW5ParseTreeNode[]): string[];
  extractTranscludes(parseTreeRoot: TW5ParseTreeNode[], title: string): string[];
  getTiddlersWithTag(tag: string): string[];
  getTagMap(): Record<string, string[]>;
  getMissingTitles(): string[];

  // ── Search ────────────────────────────────────────────────────────────────

  search(text: string, options?: {
    source?:        TW5FilterSource;
    caseSensitive?: boolean;
    invert?:        boolean;
    regex?:         boolean;
  }): string[];

  // ── Plugin management ─────────────────────────────────────────────────────

  getPluginTypes(): string[];
  readPluginInfo(titles?: string[]): { modifiedPlugins: string[]; deletedPlugins: string[] };

  // ── Indexers ──────────────────────────────────────────────────────────────

  addIndexer(indexer: TW5Indexer, name: string): void;
  getIndexer(name: string): TW5Indexer | null;

  // ── Cache ─────────────────────────────────────────────────────────────────

  getCacheForTiddler(title: string, cacheName: string, initializer: () => unknown): unknown;
  clearCache(title: string): void;
  clearGlobalCache(): void;
  getGlobalCache(cacheName: string, initializer: () => unknown): unknown;

  // ── Change count ──────────────────────────────────────────────────────────

  changeCount: Record<string, number>;
  getChangeCount(title: string): number;

  // ── Events ────────────────────────────────────────────────────────────────

  addEventListener(type: "change", handler: (changes: Record<string, TW5ChangeRecord>) => void): void;
  addEventListener(type: string,   handler: (...args: unknown[]) => void): void;
  removeEventListener(type: "change", handler: (changes: Record<string, TW5ChangeRecord>) => void): void;
  removeEventListener(type: string,   handler: (...args: unknown[]) => void): void;
  dispatchEvent(type: string, ...args: unknown[]): void;
  enqueueTiddlerEvent(title: string, isDeleted?: boolean, isShadow?: boolean): void;
  clearTiddlerEventQueue(): void;
  getSizeOfTiddlerEventQueue(): number;

  // ── Lararium projection bus ───────────────────────────────────────────────
  // KukaliWidget fires "tm-verse-event"; consumers wire via onVerseEvent().
}

// ---------------------------------------------------------------------------
// Widget (instance — function-constructor pattern)
// ---------------------------------------------------------------------------

export interface TW5WidgetInstance {
  // ── Tree ──────────────────────────────────────────────────────────────────

  parseTreeNode:  TW5ParseTreeNode;
  parentWidget:   TW5WidgetInstance | null | undefined;
  children:       TW5WidgetInstance[];
  widgetClasses:  Record<string, TW5WidgetConstructor>;

  // ── DOM ───────────────────────────────────────────────────────────────────

  parentDomNode:  TW5FakeElement | undefined;
  domNodes:       TW5FakeElement[];
  document:       TW5FakeDocument;

  // ── Context ───────────────────────────────────────────────────────────────

  wiki:           TW5Wiki;
  variables:      Record<string, {
    value:                   string;
    resultList?:             string[];
    params?:                 Array<{ name?: string; default?: string }>;
    isMacroDefinition?:      boolean;
    isFunctionDefinition?:   boolean;
    isProcedureDefinition?:  boolean;
    isWidgetDefinition?:     boolean;
    configTrimWhiteSpace?:   boolean;
  }>;

  // ── Attributes ────────────────────────────────────────────────────────────

  attributes:            Record<string, string>;
  multiValuedAttributes: Record<string, string[]>;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  initialise(parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>): void;
  execute(): void;
  render(parent: TW5FakeElement, nextSibling: TW5FakeElement | null): void;
  /** Standard refresh. The stylesheet widget variant accepts optional DOM container args. */
  refresh(changedTiddlers: Record<string, TW5ChangeRecord>, parentDomNode?: TW5FakeElement | null, nextSibling?: TW5FakeElement | null): boolean;
  refreshSelf(): void;
  refreshChildren(changedTiddlers: Record<string, TW5ChangeRecord>): boolean;
  destroy(options?: { removeDOMNodes?: boolean }): void;
  destroyChildren(options?: { removeDOMNodes?: boolean }): void;
  removeLocalDomNodes(): void;
  removeChildDomNodes(): void;

  // ── Child management ──────────────────────────────────────────────────────

  makeChildWidgets(children?: TW5ParseTreeNode[], options?: { variables?: Record<string, string> }): void;
  makeChildWidget(parseTreeNode: TW5ParseTreeNode, options?: { variables?: Record<string, unknown> }): TW5WidgetInstance;
  renderChildren(parent: TW5FakeElement, nextSibling: TW5FakeElement | null): void;
  nextSibling(): TW5WidgetInstance | null;
  previousSibling(): TW5WidgetInstance | null;
  findFirstDomNode(): TW5FakeElement | null;
  findNextSiblingDomNode(startIndex?: number): TW5FakeElement | null;
  getAncestorCount(): number;

  // ── Variables ─────────────────────────────────────────────────────────────

  setVariable(
    name:                    string,
    value:                   string | string[],
    params?:                 Array<{ name?: string; default?: string }>,
    isMacroDefinition?:      boolean,
    options?:                {
      isProcedureDefinition?:  boolean;
      isFunctionDefinition?:   boolean;
      isWidgetDefinition?:     boolean;
      configTrimWhiteSpace?:   boolean;
    },
  ): void;

  getVariable(
    name:    string,
    options?: {
      params?:       Array<{ name?: string; value?: string; multiValue?: string[] }>;
      defaultValue?: string;
      source?:       TW5FilterSource;
      allowSelfAssigned?: boolean;
    },
  ): string;

  getVariableInfo(
    name:    string,
    options?: Record<string, unknown>,
  ): {
    text:        string;
    params:      Array<{ name?: string; value: string; multiValue?: string[] }>;
    resultList:  string[];
    srcVariable: unknown;
    isCacheable: boolean;
  };

  hasVariable(name: string, value?: string): boolean;
  getStateQualifier(name?: string): string;
  evaluateMacroModule(name: string, actualParams: Record<string, unknown>[], defaultValue?: string): string;

  // ── Attributes ────────────────────────────────────────────────────────────

  computeAttributes(options?: { filterFn?: (name: string) => boolean; asList?: boolean }): Record<string, boolean>;
  computeAttribute(attribute: TW5AttributeValue, options?: { asList?: boolean }): string | string[];
  getAttribute(name: string, defaultText?: string): string;
  hasAttribute(name: string): boolean;
  hasParseTreeNodeAttribute(name: string): boolean;
  assignAttributes(domNode: TW5FakeElement, options?: {
    sourcePrefix?:           string;
    destPrefix?:             string;
    changedAttributes?:      Record<string, boolean>;
    excludeEventAttributes?: boolean;
  }): void;

  // ── Events ────────────────────────────────────────────────────────────────

  addEventListener(type: string, handler: ((event: Record<string, unknown>) => boolean | void) | string): void;
  removeEventListener(type: string, handler: ((event: Record<string, unknown>) => boolean | void) | string): void;
  dispatchEvent(event: { type: string; widget?: TW5WidgetInstance; [k: string]: unknown }): boolean;
  invokeActions(triggeringWidget: TW5WidgetInstance, event: Record<string, unknown>): boolean;
}

/** Constructor type for prototype-chain widget classes. */
export interface TW5WidgetConstructor {
  new (parseTreeNode: TW5ParseTreeNode, options: Record<string, unknown>): TW5WidgetInstance;
  prototype: TW5WidgetInstance;
}

// ---------------------------------------------------------------------------
// Module system
// ---------------------------------------------------------------------------

export interface TW5ModuleInfo {
  moduleType:  string;
  definition:  unknown;
  exports:     Record<string, unknown>;
}

export interface TW5Modules {
  /** All modules by name. */
  titles: Record<string, TW5ModuleInfo>;
  /** Modules keyed by type then by name. */
  types:  Record<string, Record<string, TW5ModuleInfo>>;

  define(name: string, moduleType: string, definition: unknown): void;
  execute(name: string): Record<string, unknown>;
  forEachModuleOfType(type: string, callback: (title: string, exports: Record<string, unknown>) => void): void;
  applyMethods(type: string, target?: Record<string, unknown>): Record<string, unknown>;
  getModulesByTypeAsHashmap(type: string, field?: string): Record<string, Record<string, unknown>>;
  createClassFromModule(exports: Record<string, unknown>, baseClass?: unknown): unknown;
  createClassesFromModules(type: string, subType?: string, baseClass?: unknown): Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export interface TW5Utils {
  // Type checking
  hop(object: unknown, property: string): boolean;
  isArray(value: unknown): value is unknown[];
  isDate(value: unknown): value is Date;
  isArrayEqual(a: unknown[], b: unknown[]): boolean;

  // String / array parsing
  parseStringArray(value: string | string[] | null | undefined, allowDuplicate?: boolean): string[];
  stringifyList(value: string | string[]): string;
  parseFields(text: string, fields?: Record<string, unknown>): Record<string, unknown>;
  parseTextReference(ref: string): { title?: string; field?: string; index?: string };
  parseFilterVariable(varRef: string): { name: string; params: string[] };
  replaceString(text: string, search: RegExp, replace: string): string;
  trim(str: string): string;
  trimPrefix(str: string, unwanted: string): string;
  trimSuffix(str: string, unwanted: string): string;
  /** Transliterate non-ASCII to ASCII (filesystem path sanitization). */
  transliterate(str: string): string;
  toSentenceCase(str: string): string;
  toTitleCase(str: string): string;
  escapeRegExp(str: string): string;

  // Array operations
  pushTop(array: unknown[], value: unknown | unknown[]): unknown[];
  insertSortedArray(array: string[], value: string): string[];
  removeArrayEntries(array: unknown[], value: unknown | unknown[]): unknown[];

  // Object operations
  extend(target: Record<string, unknown>, ...sources: Record<string, unknown>[]): Record<string, unknown>;
  deepCopy<T>(value: T): T;
  extendDeepCopy(target: Record<string, unknown>, extensions: Record<string, unknown>): Record<string, unknown>;
  deepFreeze(object: unknown): void;
  deepDefaults(target: Record<string, unknown>, ...sources: Record<string, unknown>[]): Record<string, unknown>;
  copyObjectPropertiesSafe(object: unknown): Record<string, unknown>;
  count(object: Record<string, unknown> | unknown[]): number;
  each(
    object: unknown[] | Record<string, unknown>,
    callback: (value: unknown, key: string | number, obj: unknown) => boolean | void,
  ): void;

  // Date / time
  parseDate(value: string | Date | null | undefined): Date | null;
  stringifyDate(date: Date): string;
  formatDateString(date: Date, template: string): string;
  formatTitleString(template: string, options: { base: string; separator: string; counter: number }): string;

  // Version comparison
  parseVersion(version: string): { version: string; major: number; minor: number; patch: number; prerelease?: string; build?: string };
  compareVersions(a: string, b: string): -1 | 0 | 1;
  checkVersions(a: string, b: string): boolean;

  // Encoding / decoding
  parseJSONSafe(text: string, defaultJSON?: unknown): unknown;
  htmlDecode(s: string): string;
  decodeURIComponentSafe(s: string): string;
  hashString(str: string): string;

  // DOM construction
  domMaker(tag: string, options?: {
    namespace?:      string;
    class?:          string;
    text?:           string;
    children?:       TW5FakeElement[];
    attributes?:     Record<string, string>;
    style?:          Record<string, string>;
    innerHTML?:      string;
    eventListeners?: Array<{ type: string; handler: (e: Event) => void }>;
    document?:       TW5FakeDocument | Document;
  }): TW5FakeElement;

  // Code execution
  evalGlobal(code: string, context: Record<string, unknown>, filename?: string, sandbox?: Record<string, unknown>, allowGlobals?: boolean): unknown;
  evalSandboxed(code: string, context: Record<string, unknown>, filename?: string, allowGlobals?: boolean): unknown;

  // Path / file (Node.js)
  resolvePath(sourcepath: string, rootpath: string): string;
  getFileExtensionInfo(ext: string): { type: string; encoding: string } | undefined;
  getTypeEncoding(ext: string): "utf8" | "base64";
  registerFileType(type: string, encoding: string, extension: string | string[], options?: Record<string, unknown>): void;

  // CSS
  unHyphenateCss(name: string): string;

  // Logging / timing
  log(text: string, colour?: string): void;
  warning(text: string): void;
  error(err: unknown): void;
  nextTick(callback: () => void): void;

  [util: string]: unknown;
}

// ---------------------------------------------------------------------------
// Boot subsystem
// ---------------------------------------------------------------------------

export interface TW5Boot {
  suppressBoot: boolean;
  bootPath:     string;
  argv:         string[];
  tasks:        { trapErrors?: boolean; readBrowserTiddlers?: boolean };
  logMessages:  string[];
  log(str: string): void;
  boot(callback?: () => void): void;
}

// ---------------------------------------------------------------------------
// Indexer
// ---------------------------------------------------------------------------

export interface TW5Indexer {
  init(): void;
  rebuild(): void;
  update(updateDescriptor: {
    old: { tiddler?: TW5Tiddler; shadow?: boolean };
    new: { tiddler?: TW5Tiddler; shadow?: boolean };
  }): void;
}

// ---------------------------------------------------------------------------
// Sync adaptor protocol
// ---------------------------------------------------------------------------

export interface TW5SyncAdaptorInfo {
  revision?: string;
  [field: string]: unknown;
}

export interface TW5SyncAdaptor {
  name?: string;

  /** Check login status. */
  getStatus(callback: (
    err:         Error | null,
    isLoggedIn:  boolean,
    username:    string,
    isReadOnly:  boolean,
    isAnonymous: boolean,
  ) => void): void;

  /** Persist a tiddler. `adaptorInfo` is returned to the syncer for later calls. */
  saveTiddler(
    tiddler:  TW5Tiddler,
    callback: (err: Error | null, adaptorInfo?: TW5SyncAdaptorInfo, revision?: string) => void,
    options?: { tiddlerInfo?: TW5SyncAdaptorInfo },
  ): void;

  /** Load a tiddler by title (lazy loading). */
  loadTiddler(
    title:    string,
    callback: (err: Error | null, tiddlerFields?: TW5TiddlerInputFields) => void,
  ): void;

  /** Tombstone a tiddler. */
  deleteTiddler(
    title:    string,
    callback: (err: Error | null, adaptorInfo?: TW5SyncAdaptorInfo) => void,
    options?: { tiddlerInfo?: TW5SyncAdaptorInfo },
  ): void;

  /** Adaptor-specific metadata for a given tiddler. */
  getTiddlerInfo(tiddler: TW5Tiddler): TW5SyncAdaptorInfo;

  /** Revision ID for a tiddler (used for conflict detection). */
  getTiddlerRevision(title: string): string | undefined;

  /** List of tiddlers without text (for lazy loading). */
  getSkinnyTiddlers(callback: (err: Error | null, tiddlers?: TW5TiddlerInputFields[]) => void): void;

  /** Optional: subscribe to server-push changes for a title. */
  subscribeToTiddlerChange?(
    title:    string,
    callback: (err: Error | null, tiddler?: TW5Tiddler) => void,
  ): void;

  /** Optional: inject logger for adaptor diagnostics. */
  setLoggerSaveBuffer?(logger: unknown): void;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface TW5ContentTypeInfo {
  encoding:        "utf8" | "base64";
  extension:       string | string[];
  flags?:          string[];
  deserializerType?: string;
}

export interface TW5Config {
  maxEditFileSize:    number;
  contentTypeInfo:    Record<string, TW5ContentTypeInfo>;
  fileExtensionInfo:  Record<string, { type: string }>;
  preferences?:       { jsonSpaces?: number };
}

// ---------------------------------------------------------------------------
// Root TW5 instance ($tw)
// ---------------------------------------------------------------------------

export interface TW5Instance {
  // ── Core objects ──────────────────────────────────────────────────────────

  /** Live wiki store (populated after boot). */
  wiki:    TW5Wiki;
  /** Tiddler constructor. */
  Tiddler: TW5TiddlerConstructor;
  /** Wiki constructor + static methods. */
  Wiki:    TW5WikiStatic;

  // ── Module / extension system ─────────────────────────────────────────────

  modules:         TW5Modules;
  filterOperators: Record<string, TW5FilterOperatorFn>;
  utils:           TW5Utils;
  config:          TW5Config;
  macros:          Record<string, unknown>;

  // ── Runtime objects ───────────────────────────────────────────────────────

  /** Root widget (after boot in panel/server render mode). */
  rootWidget:   TW5WidgetInstance;
  /** Server-side fake document. */
  fakeDocument: TW5FakeDocument;
  /** Syncer (browser only, after boot). */
  syncer?:      { isDirty(): boolean; [k: string]: unknown };

  // ── Boot subsystem ────────────────────────────────────────────────────────

  /** Tiddlers queued before boot() runs — TW5 discovers them at startup. */
  preloadTiddlers: Record<string, unknown>[];
  boot: TW5Boot;

  // ── Platform flags ────────────────────────────────────────────────────────

  /** Set in browser environment. */
  browser?: Record<string, unknown>;
  /** Set in Node.js environment. */
  node?:    Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Module export — `import("tiddlywiki")`
//
// TW5 npm package exports `{ TiddlyWiki }` in both CJS and ESM forms.
// The blob-eval in tw5-host-bridge.ts (makeNodeBootEnv) handles the CJS default
// wrapping; the shim types only the resolved factory.
// ---------------------------------------------------------------------------

declare module "tiddlywiki" {
  /** Create a fresh TW5 instance. Call .boot.boot() to initialise. */
  function TiddlyWiki(): TW5Instance;
  export = { TiddlyWiki };
}

// Global $tw — injected by TW5 core script at boot time (browser and Node).
// Declared here so tw5-vm.ts can read globalThis.$tw without `as any`.
declare global {
  var $tw: TW5Instance | undefined;
}
