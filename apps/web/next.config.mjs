/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@plancore/core'],
  webpack: (config) => {
    // @plancore/core uses explicit `.js` specifiers (NodeNext-style) on its
    // TypeScript sources. Let webpack resolve them back to `.ts`/`.tsx`.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
