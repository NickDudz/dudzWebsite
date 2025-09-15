/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal config to avoid Windows permission issues
  output: undefined,
  webpack: (config, { isServer }) => {
    return config
  },
}

module.exports = nextConfig
