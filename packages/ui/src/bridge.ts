import { createLocalBridge } from './localBridge'

export interface RpcEnvelope<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface NativeBridge {
  call<T = unknown>(method: string, params?: unknown): Promise<T>
}

interface LynxBridgeLike {
  call?: (
    method: string,
    params: unknown,
    callback: (result: unknown) => void,
  ) => void
  request?: (message: { method: string; params?: unknown }) => Promise<unknown>
}

declare const NativeModules: { bridge?: LynxBridgeLike } | undefined

function nativeBridge(): LynxBridgeLike | null {
  try {
    if (typeof NativeModules !== 'undefined' && NativeModules?.bridge)
      return NativeModules.bridge
  } catch {
    // fall through to the web-preview fallback
  }
  const scope = globalThis as unknown as {
    NativeModules?: { bridge?: LynxBridgeLike }
  }
  return scope.NativeModules?.bridge ?? null
}

function unwrap<T>(raw: unknown): T {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as RpcEnvelope<T>
      if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
        if (!parsed.ok) throw new Error(parsed.error || 'Native call failed')
        return parsed.data as T
      }
      return raw as unknown as T
    } catch (error) {
      if (error instanceof SyntaxError) return raw as unknown as T
      throw error
    }
  }
  const parsed = raw as RpcEnvelope<T> | null
  if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
    if (!parsed.ok) throw new Error(parsed.error || 'Native call failed')
    return parsed.data as T
  }
  return raw as T
}

export function createBridge(): NativeBridge {
  const bridge = nativeBridge()
  if (!bridge) {
    const scope = globalThis as unknown as { __MAIBROWSER_PLATFORM__?: string }
    if (scope.__MAIBROWSER_PLATFORM__ === 'android') return createLocalBridge()
    return {
      async call<T>(method: string): Promise<T> {
        if (method === 'app:info') {
          return {
            name: 'MaiBrowser',
            version: '0.1.0',
            platform: 'windows',
            dataPath: '',
            dbPath: '',
            engine: 'Lynxtron',
            versionLabel: '0.1.0 (web preview)',
          } as T
        }
        throw new Error(
          'MaiBrowser native bridge is not available in this build',
        )
      },
    }
  }
  return {
    call<T>(method: string, params?: unknown): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Native call timed out: ${method}`))
        }, 30_000)
        const finish = (result: unknown) => {
          clearTimeout(timer)
          try {
            resolve(unwrap<T>(result))
          } catch (error) {
            reject(error)
          }
        }
        try {
          if (bridge.call) {
            bridge.call('rpc', { method, params: params ?? {} }, finish)
            return
          }
          if (bridge.request) {
            bridge
              .request({ method: 'rpc', params: { method, params } })
              .then(finish)
              .catch((error: unknown) => {
                clearTimeout(timer)
                reject(error)
              })
            return
          }
          throw new Error('Native bridge has no call method')
        } catch (error) {
          clearTimeout(timer)
          reject(error)
        }
      })
    },
  }
}
