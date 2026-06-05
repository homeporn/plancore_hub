/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@plancore/core', '@plancore/data', '@plancore/store', '@plancore/ui'],
  webpack: (config) => {
    // The @plancore/* workspace packages use explicit `.js` specifiers
    // (NodeNext-style) on their TypeScript sources. Let webpack resolve them
    // back to `.ts`/`.tsx`.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
