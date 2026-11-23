import type { Locale } from '@maibrowser/core'

export type RunAt = 'document-start' | 'document-end' | 'document-idle'

export interface UserScriptMeta {
  id: string
  name: string
  namespace: string
  version: string
  description: string
  author: string
  icon: string
  match: string[]
  include: string[]
  exclude: string[]
  grant: string[]
  require: string[]
  resource: { name: string; url: string }[]
  connect: string[]
  runAt: RunAt
  noframes: boolean
  updateUrl: string
  downloadUrl: string
  localizedName: Record<string, string>
  localizedDescription: Record<string, string>
}

export interface UserScript {
  id: string
  meta: UserScriptMeta
  source: string
  enabled: boolean
}

export interface InjectionOptions {
  url: string
  values?: Record<string, Record<string, string>>
  requires?: Record<string, string[]>
  resources?: Record<string, Record<string, string>>
  locale?: Locale
  stage?: 'start' | 'end' | 'idle'
}

function pickLocalized(
  map: Record<string, string>,
  locale: Locale,
  fallback: string,
): string {
  const lower: Record<string, string> = {}
  for (const [key, value] of Object.entries(map))
    lower[key.toLowerCase()] = value
  return (
    lower[locale.toLowerCase()] ??
    lower['zh-cn'] ??
    lower['zh-hans'] ??
    lower.en ??
    fallback
  )
}

function makeId(meta: { name: string; namespace: string }): string {
  const input = `${meta.namespace}:${meta.name}`
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return `u_${Math.abs(hash).toString(36)}`
}

export function parseMetadata(
  source: string,
  locale: Locale = 'zh-Hans',
): UserScriptMeta | null {
  const header = source.match(
    /\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/,
  )
  if (!header) return null
  const lines = header[1].split(/\r?\n/)
  const values = new Map<string, string[]>()
  for (const line of lines) {
    const match = line.match(/^\s*\/\/\s*@(\S+)(?:\s+(.*))?$/)
    if (!match) continue
    const key = match[1].toLowerCase()
    const value = (match[2] ?? '').trim()
    if (!value && key !== 'noframes') continue
    const list = values.get(key) ?? []
    list.push(value)
    values.set(key, list)
  }
  const first = (key: string, fallback = '') => values.get(key)?.[0] ?? fallback
  const many = (key: string) => values.get(key) ?? []
  const localizedName: Record<string, string> = {}
  const localizedDescription: Record<string, string> = {}
  for (const [key, list] of values) {
    if (key.startsWith('name:')) localizedName[key.slice(5)] = list[0]
    if (key.startsWith('description:'))
      localizedDescription[key.slice(12)] = list[0]
  }
  const name = first('name', 'Untitled userscript')
  const namespace = first('namespace', '')
  const runAtValue = first('run-at', 'document-end') as RunAt
  const runAt: RunAt =
    runAtValue === 'document-start' || runAtValue === 'document-idle'
      ? runAtValue
      : 'document-end'
  const resources = many('resource')
    .map((entry) => entry.split(/\s+/, 2))
    .filter((parts) => parts.length === 2)
    .map(([resourceName, url]) => ({ name: resourceName, url }))
  return {
    id: makeId({ name, namespace }),
    name: pickLocalized(localizedName, locale, name),
    namespace,
    version: first('version', '0.0.0'),
    description: pickLocalized(
      localizedDescription,
      locale,
      first('description', ''),
    ),
    author: first('author', ''),
    icon: first('icon', first('iconURL', '')),
    match: many('match'),
    include: many('include'),
    exclude: many('exclude'),
    grant: many('grant'),
    require: many('require'),
    resource: resources,
    connect: many('connect'),
    runAt,
    noframes: values.has('noframes'),
    updateUrl: first('updateURL', ''),
    downloadUrl: first('downloadURL', ''),
    localizedName,
    localizedDescription,
  }
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`)
}

function compileInclude(pattern: string): RegExp {
  if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
    const end = pattern.lastIndexOf('/')
    try {
      return new RegExp(pattern.slice(1, end), pattern.slice(end + 1))
    } catch {
      return globToRegExp(pattern)
    }
  }
  return globToRegExp(pattern)
}

export function matchPattern(pattern: string, url: string): boolean {
  const match = pattern.match(/^(\*|https?|file|ftp|wss?):\/\/([^/]*)(\/.*)$/)
  if (!match) return false
  const parsed = url.match(
    /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/,
  )
  if (!parsed) return false
  const [, scheme, host, pathname, search = '', hash = ''] = parsed
  if (match[1] !== '*' && match[1] !== scheme.toLowerCase()) return false
  const patternHost = match[2].toLowerCase()
  const hostWithPort = (host.split('@').pop() ?? '').toLowerCase()
  const hostname = hostWithPort.split(':')[0] ?? ''
  if (patternHost !== '*') {
    if (patternHost.startsWith('*.')) {
      const base = patternHost.slice(2)
      if (hostname !== base && !hostname.endsWith(`.${base}`)) return false
    } else if (
      (patternHost.includes(':') ? hostWithPort : hostname) !== patternHost
    ) {
      return false
    }
  }
  const path = `${pathname || '/'}${search}${hash}`
  return globToRegExp(match[3]).test(path)
}

export function matchUrl(meta: UserScriptMeta, url: string): boolean {
  if (url.startsWith('maibrowser://')) return false
  for (const pattern of meta.exclude) {
    if (
      pattern.startsWith('/')
        ? compileInclude(pattern).test(url)
        : matchPattern(pattern, url)
    ) {
      return false
    }
  }
  for (const include of meta.include) {
    if (compileInclude(include).test(url)) return true
  }
  for (const pattern of meta.match) {
    if (matchPattern(pattern, url)) return true
  }
  return false
}

const SHIM = String.raw`
;(function () {
  'use strict';
  var __MB_ID = "__MB_ID__";
  var __MB_META = __MB_META_JSON__;
  var __MB_VALUES = __MB_VALUES_JSON__;
  var __MB_RESOURCES = __MB_RESOURCES_JSON__;
  var __MB_RESOURCE_URLS = __MB_RESOURCE_URLS_JSON__;
  var __MB_POST = function (method, params) {
    try {
      window.postMessage('__MB__' + JSON.stringify({
        scriptId: __MB_ID,
        method: method,
        params: params || {}
      }), '*');
    } catch (e) {}
  };
  var __MB_XHR = window.__MB_XHR__ || (window.__MB_XHR__ = {});
  var __MB_MENU = window.__MB_MENU__ || (window.__MB_MENU__ = {});
  var __MB_LISTENERS = {};
  var GM_info = {
    script: __MB_META,
    scriptMetaStr: __MB_META.raw || '',
    scriptHandler: 'MaiBrowser',
    version: '0.1.2',
    userAgent: navigator.userAgent
  };
  function GM_getValue(key, defaultValue) {
    if (Object.prototype.hasOwnProperty.call(__MB_VALUES, key)) return __MB_VALUES[key];
    return defaultValue;
  }
  function GM_setValue(key, value) {
    __MB_VALUES[key] = value;
    __MB_POST('gm:setValue', { key: String(key), value: String(value) });
  }
  function GM_deleteValue(key) {
    delete __MB_VALUES[key];
    __MB_POST('gm:deleteValue', { key: String(key) });
  }
  function GM_listValues() {
    return Object.keys(__MB_VALUES);
  }
  function GM_addStyle(css) {
    var style = document.createElement('style');
    style.textContent = String(css);
    (document.head || document.documentElement).appendChild(style);
    return style;
  }
  function GM_addElement(parentOrTag, tagOrAttrs, maybeAttrs) {
    var parent = document.head || document.documentElement;
    var tag = parentOrTag;
    var attrs = tagOrAttrs || {};
    if (typeof parentOrTag === 'object' && parentOrTag !== null) {
      parent = parentOrTag;
      tag = tagOrAttrs;
      attrs = maybeAttrs || {};
    }
    var element = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'textContent') element.textContent = attrs[key];
      else element.setAttribute(key, attrs[key]);
    });
    parent.appendChild(element);
    return element;
  }
  function GM_log(message) {
    console.log('[userscript]', message);
  }
  function GM_registerMenuCommand(name, callback, accessKey) {
    var id = 'm' + Math.random().toString(36).slice(2);
    __MB_MENU[id] = callback;
    __MB_POST('gm:menu:register', { id: id, name: String(name), accessKey: accessKey || '' });
    return id;
  }
  function GM_unregisterMenuCommand(id) {
    delete __MB_MENU[id];
    __MB_POST('gm:menu:unregister', { id: String(id) });
  }
  function GM_openInTab(url, options) {
    __MB_POST('gm:openInTab', { url: String(url), options: options || {} });
  }
  function GM_notification(details, ondone) {
    var payload = typeof details === 'string'
      ? { text: details, title: arguments[1] || '', image: arguments[2] || '' }
      : details || {};
    __MB_POST('gm:notification', payload);
    if (typeof ondone === 'function') setTimeout(ondone, 0);
  }
  function GM_setClipboard(data, info, cb) {
    __MB_POST('gm:setClipboard', { data: String(data), info: info || '' });
    if (typeof cb === 'function') setTimeout(cb, 0);
  }
  function GM_download(details, name) {
    var payload = typeof details === 'string'
      ? { url: details, name: name || '' }
      : details || {};
    __MB_POST('gm:download', payload);
  }
  function GM_xmlhttpRequest(details) {
    var id = 'x' + Math.random().toString(36).slice(2);
    __MB_XHR[id] = function (response) {
      try {
        if (response && response.error) {
          if (details.onerror) details.onerror(response);
        } else {
          if (details.onload) details.onload(response);
        }
      } finally {
        delete __MB_XHR[id];
      }
    };
    __MB_POST('gm:xhr', {
      id: id,
      method: (details.method || 'GET').toUpperCase(),
      url: details.url,
      headers: details.headers || {},
      data: details.data == null ? null : details.data,
      timeout: details.timeout || 0
    });
    return {
      abort: function () {
        delete __MB_XHR[id];
        __MB_POST('gm:xhr:abort', { id: id });
      }
    };
  }
  function GM_addValueChangeListener(key, listener) {
    var id = 'v' + Math.random().toString(36).slice(2);
    __MB_LISTENERS[id] = listener;
    return id;
  }
  function GM_removeValueChangeListener(id) {
    delete __MB_LISTENERS[id];
  }
  function GM_getResourceText(name) {
    return __MB_RESOURCES[name] || '';
  }
  function GM_getResourceURL(name) {
    return __MB_RESOURCE_URLS[name] || '';
  }
  var GM = {
    getValue: function (key, defaultValue) { return Promise.resolve(GM_getValue(key, defaultValue)); },
    setValue: function (key, value) { return Promise.resolve(GM_setValue(key, value)); },
    deleteValue: function (key) { return Promise.resolve(GM_deleteValue(key)); },
    listValues: function () { return Promise.resolve(GM_listValues()); },
    addStyle: function (css) { return Promise.resolve(GM_addStyle(css)); },
    addElement: function () { return Promise.resolve(GM_addElement.apply(null, arguments)); },
    log: function (message) { GM_log(message); },
    registerMenuCommand: function (name, callback, accessKey) {
      return Promise.resolve(GM_registerMenuCommand(name, callback, accessKey));
    },
    unregisterMenuCommand: function (id) {
      return Promise.resolve(GM_unregisterMenuCommand(id));
    },
    openInTab: function (url, options) {
      return Promise.resolve(GM_openInTab(url, options));
    },
    notification: function (details, ondone) {
      return Promise.resolve(GM_notification(details, ondone));
    },
    setClipboard: function (data, info) {
      return Promise.resolve(GM_setClipboard(data, info));
    },
    download: function (details, name) {
      return Promise.resolve(GM_download(details, name));
    },
    xmlHttpRequest: function (details) {
      return new Promise(function (resolve, reject) {
        details.onload = resolve;
        details.onerror = reject;
        GM_xmlhttpRequest(details);
      });
    },
    info: GM_info
  };
  var unsafeWindow = window;
  window.GM_info = GM_info;
  window.GM_getValue = GM_getValue;
  window.GM_setValue = GM_setValue;
  window.GM_deleteValue = GM_deleteValue;
  window.GM_listValues = GM_listValues;
  window.GM_addStyle = GM_addStyle;
  window.GM_addElement = GM_addElement;
  window.GM_log = GM_log;
  window.GM_registerMenuCommand = GM_registerMenuCommand;
  window.GM_unregisterMenuCommand = GM_unregisterMenuCommand;
  window.GM_openInTab = GM_openInTab;
  window.GM_notification = GM_notification;
  window.GM_setClipboard = GM_setClipboard;
  window.GM_download = GM_download;
  window.GM_xmlhttpRequest = GM_xmlhttpRequest;
  window.GM_addValueChangeListener = GM_addValueChangeListener;
  window.GM_removeValueChangeListener = GM_removeValueChangeListener;
  window.GM_getResourceText = GM_getResourceText;
  window.GM_getResourceURL = GM_getResourceURL;
  window.GM = GM;
})();
`

function shimFor(
  script: UserScript,
  values: Record<string, string>,
  resources: Record<string, string> = {},
): string {
  const resourceUrls: Record<string, string> = {}
  for (const [name, content] of Object.entries(resources)) {
    resourceUrls[name] =
      `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
  }
  return SHIM.replace(/__MB_ID__/g, () => script.id)
    .replace(/__MB_META_JSON__/g, () =>
      JSON.stringify({ ...script.meta, raw: '' }),
    )
    .replace(/__MB_VALUES_JSON__/g, () => JSON.stringify(values ?? {}))
    .replace(/__MB_RESOURCES_JSON__/g, () => JSON.stringify(resources))
    .replace(/__MB_RESOURCE_URLS_JSON__/g, () => JSON.stringify(resourceUrls))
}

export function buildInjection(
  scripts: UserScript[],
  options: InjectionOptions,
): string {
  const active = scripts.filter(
    (script) => script.enabled && matchUrl(script.meta, options.url),
  )
  if (active.length === 0) return ''
  const parts: string[] = []
  for (const script of active) {
    const values = options.values?.[script.id] ?? {}
    const requires = options.requires?.[script.id] ?? []
    const resources = options.resources?.[script.id] ?? {}
    const meta = { ...script.meta, id: script.id }
    const withMeta = { ...script, meta }
    parts.push(`/* == MaiBrowser userscript: ${script.meta.name} == */`)
    parts.push('try {')
    if (requires.length > 0) parts.push(requires.join('\n;\n'))
    parts.push(shimFor(withMeta, values, resources))
    parts.push(`;(function () {\n${script.source}\n}).call(window);`)
    parts.push(
      '} catch (error) { console.error("[MaiBrowser userscript]", error); }',
    )
  }
  return parts.join('\n')
}

export function metaToJson(meta: UserScriptMeta): string {
  return JSON.stringify(meta, null, 2)
}

export function isUserScriptSource(source: string): boolean {
  return (
    /\/\/\s*==UserScript==/.test(source) &&
    /\/\/\s*==\/UserScript==/.test(source)
  )
}
