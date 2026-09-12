import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { TrustedIdentity } from "@/lib/types";

const STORE_PATH = join(process.cwd(), ".truststep", "trusted-identities.json");

async function read(): Promise<TrustedIdentity[]> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as TrustedIdentity[] : [];
  } catch {
    return [];
  }
}

async function write(items: TrustedIdentity[]) {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(items, null, 2), "utf8");
}

export async function listDevTrustedIdentities(companyId: string) {
  return (await read()).filter((item) => item.company_id === companyId);
}

export async function createDevTrustedIdentity(input: Omit<TrustedIdentity, "id" | "created_at">) {
  const item: TrustedIdentity = { ...input, id: `trusted-${randomUUID()}`, created_at: new Date().toISOString() };
  const items = await read();
  await write([item, ...items]);
  return item;
}

export async function deleteDevTrustedIdentity(companyId: string, id: string) {
  const items = await read();
  const next = items.filter((item) => item.id !== id || item.company_id !== companyId);
  if (items.length === next.length) return false;
  await write(next);
  return true;
}
