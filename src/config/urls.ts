import { ChainId } from "@summitx/chains";

export const V3_SUBGRAPH_URL = {
  [ChainId.BASECAMP]:
    "https://lb.graph.summitx.finance/subgraphs/name/summitx-exchange-v3",
  [ChainId.CAMP]:
    "https://lb.graph.mainnet.summitx.finance/subgraphs/name/summitx-exchange-v3",
  [ChainId.MEGAETH_TESTNET]:
    "https://graph.testnet.megaeth.summitx.finance/subgraphs/name/summitx/exchange-v3-users-megaeth-testnet",
};

export const V2_SUBGRAPH_URL = {
  [ChainId.BASECAMP]:
    "https://lb.graph.summitx.finance/subgraphs/name/summitx-exchange-v2",
  [ChainId.CAMP]:
    "https://lb.graph.mainnet.summitx.finance/subgraphs/name/summitx-exchange-v2",
  [ChainId.MEGAETH_TESTNET]:
    "https://graph.testnet.megaeth.summitx.finance/subgraphs/name/summitx/exchange-v2-megaeth-testnet",
};

export const LAUNCHPAD_SUBGRAPH_URL = {
  [ChainId.BASECAMP]: "",
  [ChainId.CAMP]: "",
};

export const INETEGRATED_API = {
  [ChainId.BASECAMP]: "https://integrated-api.summitx.finance/api",
  [ChainId.CAMP]: "https://integrated-api.mainnet.summitx.finance/api",
  [ChainId.MEGAETH_TESTNET]: "https://integrated-api.testnet.megaeth.summitx.finance",
};
