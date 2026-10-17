import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve, sep } from "node:path";
import type { ObjectStorage } from "./index.ts";

const SAFE_KEY = /^[\w\-/.]+$/;

/** Resolves `key` inside `root`, rejecting traversal attempts. */
export function resolveKey(root: string, key: string): string | null {
  if (!SAFE_KEY.test(key) || key.includes("..")) {
    return null;
  }
  const base = resolve(root);
  const target = resolve(base, normalize(key));
  return target.startsWith(base + sep) ? target : null;
}

export function createLocalStorage(options: {
  directory: string;
  publicPath: string;
}): ObjectStorage {
  return {
    async put(key, body) {
      const target = resolveKey(options.directory, key);
      if (!target) {
        throw new Error(`Invalid storage key: ${key}`);
      }
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, body);
      return { key, url: `${options.publicPath}/${key}` };
    },
    async delete(keys) {
      await Promise.all(
        keys.map(async (key) => {
          const target = resolveKey(options.directory, key);
          if (target) {
            await rm(target, { force: true });
          }
        }),
      );
    },
  };
}

export async function readLocalObject(
  root: string,
  key: string,
): Promise<{ data: Uint8Array<ArrayBuffer>; size: number } | null> {
  const target = resolveKey(root, key);
  if (!target) {
    return null;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) {
      return null;
    }
    return { data: new Uint8Array(await readFile(target)), size: info.size };
  } catch {
    return null;
  }
}

export function joinKey(...parts: string[]): string {
  return join(...parts).replaceAll("\\", "/");
}
