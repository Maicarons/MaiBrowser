// Copyright 2026 The Lynxtron Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { pluginLynxConfig } from '@lynx-js/config-rsbuild-plugin'
import { pluginRspeedyDevReady } from '@lynx-js/lynxtron-dev-plugins/rspeedy'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import { defineConfig } from '@lynx-js/rspeedy'
import type { CompilerOptions, Config } from '@lynx-js/type-config'
import { compilerOptionsKeys, configKeys } from '@lynx-js/type-config'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootPath = process.cwd()
console.log('rootPath: ', path.resolve(rootPath, './src/assets'))
export default defineConfig({
  server: {
    port: 5969,
  },
  resolve: {
    alias: {
      '@assets': path.resolve(rootPath, './src/assets'),
    },
  },
  output: {
    filename: '[name].[platform].bundle',
  },
  environments: {
    web: {
      source: {
        entry: {
          main: './src/app/index.tsx',
        },
      },
      output: {
        target: 'web',
        distPath: {
          root: './output/bundle/web',
        },
      },
    },
    lynx: {
      source: {
        entry: {
          main: './src/app/index.tsx',
        },
      },
      output: {
        assetPrefix: new URL(
          './dist/desktop/',
          pathToFileURL(__dirname + path.sep),
        ).toString(),
        distPath: {
          root: './output/bundle/lynx',
        },
      },
    },
  },
  plugins: [
    pluginLynxConfig(
      {
        alignMouseEventWithW3C: true,
        enableCSSInheritance: true,
        enableCSSInlineVariables: true,
      },
      {
        configKeys: [...configKeys, 'alignMouseEventWithW3C'],
        compilerOptionsKeys,
        validate: (input) =>
          input as Config &
            CompilerOptions & {
              alignMouseEventWithW3C: boolean
            },
      },
    ),
    pluginReactLynx({
      enableCSSInheritance: true,
    }),
    pluginTypeCheck(),
    pluginRspeedyDevReady(),
  ],
})
