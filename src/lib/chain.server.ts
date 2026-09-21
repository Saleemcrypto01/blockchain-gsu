import { ethers } from "ethers";
import artifact from "./project-registry.artifact.json";

export const CONTRACT_ABI = artifact.abi as ethers.InterfaceAbi;
export const CONTRACT_BYTECODE = artifact.bytecode as string;

export const NETWORK_NAME = "sepolia";
export const EXPLORER_BASE = "https://sepolia.etherscan.io";

export function getRpcUrl(): string | null {
  return process.env["SEPOLIA_RPC_URL"] ?? null;
}

export function getProvider(): ethers.JsonRpcProvider | null {
  const rpc = getRpcUrl();
  if (!rpc) return null;
  return new ethers.JsonRpcProvider(rpc);
}

export function getWallet(provider: ethers.JsonRpcProvider): ethers.Wallet | null {
  const pk = process.env["BLOCKCHAIN_PRIVATE_KEY"];
  if (!pk) return null;
  const normalized = pk.startsWith("0x") ? pk : `0x${pk}`;
  return new ethers.Wallet(normalized, provider);
}

/** Deterministic bytes32 key derived from the submission UUID. */
export function recordKeyFor(submissionId: string): string {
  return ethers.id(submissionId);
}

export function toBytes32Hash(sha256Hex: string): string {
  const clean = sha256Hex.startsWith("0x") ? sha256Hex.slice(2) : sha256Hex;
  return `0x${clean}`;
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ChainConfig = {
  configured: boolean;
  rpc: boolean;
  wallet: boolean;
  contractAddress: string | null;
};

export function readContractAddress(settingsValue: unknown): string | null {
  const fromEnv = process.env["PROJECT_REGISTRY_ADDRESS"];
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (settingsValue && typeof settingsValue === "object") {
    const addr = (settingsValue as Record<string, unknown>)["contract_address"];
    if (typeof addr === "string" && addr.length > 0) return addr;
  }
  return null;
}
