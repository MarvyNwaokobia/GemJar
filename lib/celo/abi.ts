import { parseAbi } from "viem";

export const prizePoolAbi = parseAbi([
  "function stakeAmount() view returns (uint256)",
  "function savingsRateBps() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function stakesOf(uint256 roundId, address player) view returns (uint256)",
  "function scoreSubmissionsOf(uint256 roundId, address player) view returns (uint256)",
  "function claimedOf(uint256 roundId, address player) view returns (bool)",
  "function pendingPayout(uint256 roundId, address player) view returns (uint256)",
  "function stake()",
  "function submitScore(uint256 score)",
  "function claim(uint256 roundId)",
]);

export const savingsJarAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function streak(address account) view returns (uint256)",
  "function longestStreak(address account) view returns (uint256)",
  "function isStreakActive(address account) view returns (bool)",
  "function withdraw(uint256 amount)",
]);

export const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
