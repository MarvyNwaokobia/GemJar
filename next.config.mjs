/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi/connectors re-exports its full connector set, but GemJar only
    // uses the injected connector. The other connectors' optional SDKs are
    // referenced via dynamic imports with runtime fallbacks, but webpack
    // still tries to resolve them at build time - alias them away rather
    // than installing unused wallet SDKs.
    config.resolve.alias = {
      ...config.resolve.alias,
      "porto/internal": false,
      porto: false,
      accounts: false,
      "@base-org/account": false,
      "@coinbase/wallet-sdk": false,
      "@metamask/connect-evm": false,
      "@safe-global/safe-apps-provider": false,
      "@safe-global/safe-apps-sdk": false,
      "@walletconnect/ethereum-provider": false,
    };
    return config;
  },
};

export default nextConfig;
