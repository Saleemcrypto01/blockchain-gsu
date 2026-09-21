export async function sha256File(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function shortHash(hash: string | null | undefined, size = 10): string {
  if (!hash) return "—";
  if (hash.length <= size * 2 + 3) return hash;
  return `${hash.slice(0, size)}…${hash.slice(-6)}`;
}

export const EXPLORER_BASE = "https://sepolia.etherscan.io";
