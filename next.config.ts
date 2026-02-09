import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['shiki'],
  serverExternalPackages: ['langium', '@mermaid-js/parser'],
  reactCompiler: true,
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'vscode-jsonrpc': false,
        langium: false,
      }
    }
    return config
  },
}

export default withNextIntl(nextConfig)
