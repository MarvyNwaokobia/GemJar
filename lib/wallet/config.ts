import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { celoMainnet, celoSepolia, SUPPORTED_CHAINS } from "@/lib/celo/chains";

export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  // EIP-6963 injected covers MetaMask, Rabby, Brave, Valora, and MiniPay's
  // own window.ethereum - one connector for both the MiniPay auto-connect
  // and the standard browser flow.
  connectors: [injected()],
  transports: {
    [celoMainnet.id]: http(),
    [celoSepolia.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
