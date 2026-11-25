import { useEffect, useRef, useState } from '@lynx-js/react'
import type { Tab } from '@maibrowser/core'

export interface WebviewMessageEvent {
  detail?: {
    msg?: string | Record<string, unknown>
    url?: string
    errorCode?: number
    errorMsg?: string
  }
}

export const PAGE_BOOTSTRAP = `(function () {
  try {
    var last = '';
    function meta() {
      try {
        var payload = '__MB_META__' + JSON.stringify({ title: document.title || '', url: location.href });
        if (payload === last) return;
        last = payload;
        window.postMessage(payload, '*');
      } catch (e) {}
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(meta, 30); });
    } else {
      setTimeout(meta, 30);
    }
    setTimeout(meta, 700);
    window.addEventListener('popstate', meta);
    window.addEventListener('hashchange', meta);
    var push = history.pushState;
    var replace = history.replaceState;
    history.pushState = function () { var result = push.apply(this, arguments); setTimeout(meta, 20); return result; };
    history.replaceState = function () { var result = replace.apply(this, arguments); setTimeout(meta, 20); return result; };
    function sendDownload(url, name) {
      try {
        if (!/^https?:/i.test(String(url))) return false;
        window.postMessage('__MB_DOWNLOAD__' + JSON.stringify({ url: String(url), fileName: name || '', mime: '' }), '*');
        return true;
      } catch (e) { return false; }
    }
    document.addEventListener('click', function (event) {
      try {
        var node = event.target;
        while (node && node !== document && (!node.getAttribute || String(node.tagName).toLowerCase() !== 'a')) node = node.parentNode;
        if (!node || node === document || String(node.tagName).toLowerCase() !== 'a') return;
        var rawHref = node.getAttribute('href') || '';
        if (!rawHref) return;
        var marked = node.hasAttribute('download');
        var rel = node.getAttribute('rel') || '';
        if (!marked && !/download/i.test(rel)) return;
        var absolute = node.href || rawHref;
        var name = node.getAttribute('download') || '';
        if (sendDownload(absolute, name)) {
          event.preventDefault();
          event.stopPropagation();
        }
      } catch (e) {}
    }, true);
    window.addEventListener('gm:download', function (event) {
      try {
        var detail = (event && event.detail) || {};
        var url = detail.url || detail.href || '';
        if (!url) return;
        if (event.preventDefault) event.preventDefault();
        sendDownload(url, detail.name || detail.fileName || '');
      } catch (e) {}
    }, true);
  } catch (e) {}
})();`

export function WebPanel(props: {
  tab: Tab & { navId?: number }
  active: boolean
  background: string
  onLoad: (tabId: string, url: string) => void
  onError: (tabId: string, message: string) => void
  onLocationChange: (tabId: string, url: string) => void
  onMessage: (tabId: string, message: string | Record<string, unknown>) => void
  onOpenWindow: (url: string) => void
}) {
  const [src, setSrc] = useState(props.tab.url)
  const lastNav = useRef(props.tab.navId ?? 0)

  useEffect(() => {
    if ((props.tab.navId ?? 0) !== lastNav.current) {
      lastNav.current = props.tab.navId ?? 0
      setSrc(props.tab.url)
    }
  }, [props.tab.navId, props.tab.url])

  if (!src) return null

  return (
    <view
      className="web-layer"
      style={{
        zIndex: props.active ? 2 : 1,
        backgroundColor: '#ffffff',
        display: props.active ? 'flex' : 'flex',
      }}
    >
      <webview
        id={`webview-${props.tab.id}`}
        className="webview"
        style={{ width: '100%', height: '100%' }}
        src={src}
        use-osr={true}
        enable-debug={true}
        native-interaction-enabled={props.active ? true : false}
        bindload={() => props.onLoad(props.tab.id, src)}
        binderror={(event: WebviewMessageEvent) =>
          props.onError(
            props.tab.id,
            event.detail?.errorMsg ||
              `Error ${event.detail?.errorCode ?? ''}`.trim(),
          )
        }
        bindlocationchange={(event: WebviewMessageEvent) => {
          if (event.detail?.url)
            props.onLocationChange(props.tab.id, event.detail.url)
        }}
        bindmessage={(event: WebviewMessageEvent) => {
          const message = event.detail?.msg
          if (message !== undefined) props.onMessage(props.tab.id, message)
        }}
        bindopenwindow={(event: WebviewMessageEvent) => {
          if (event.detail?.url) props.onOpenWindow(event.detail.url)
        }}
      />
    </view>
  )
}
