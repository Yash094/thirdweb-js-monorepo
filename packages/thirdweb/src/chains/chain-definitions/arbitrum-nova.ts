import { defineChain } from "../utils.js";

/**
 * @chain
 */
export const arbitrumNova = /* @__PURE__ */ defineChain({
  id: 42170,
  name: "Arbitrum Nova",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorers: [
    {
      name: "Arbiscan",
      url: "https://nova.arbiscan.io/",
    },
  ],
});
