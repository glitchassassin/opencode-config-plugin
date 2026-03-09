import { readFileSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';

const SCHEMA_URL = 'https://opencode.ai/config.json';
const CACHE_DURATION_MS = 60 * 60 * 1000;

interface SchemaCache {
  schema: object;
  etag: string;
  timestamp: number;
}

let cachedSchema: SchemaCache | null = null;

export interface SchemaOperations {
  fetchSchema(): Promise<object>;
  getCachedSchema(): object | null;
}

export function createSchemaOperations(): SchemaOperations {
  const cachePath = resolve(tmpdir(), 'opencode-config-validator-schema.json');

  function loadCache(): SchemaCache | null {
    try {
      const content = readFileSync(cachePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  function saveCache(cache: SchemaCache): void {
    writeFileSync(cachePath, JSON.stringify(cache));
  }

  return {
    async fetchSchema(): Promise<object> {
      const now = Date.now();

      if (cachedSchema && (now - cachedSchema.timestamp) < CACHE_DURATION_MS) {
        return cachedSchema.schema;
      }

      const cache = loadCache();
      if (cache && (now - cache.timestamp) < CACHE_DURATION_MS) {
        cachedSchema = cache;
        return cache.schema;
      }

      try {
        const response = await fetch(SCHEMA_URL, {
          headers: cache?.etag ? { 'If-None-Match': cache.etag } : {}
        });

        if (response.status === 304 && cache) {
          cachedSchema = { ...cache, timestamp: now };
          saveCache(cachedSchema);
          return cache.schema;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.status}`);
        }

        const etag = response.headers.get('ETag') || '';
        const schema = await response.json() as object;

        const newCache: SchemaCache = { schema, etag, timestamp: now };
        cachedSchema = newCache;
        saveCache(newCache);

        return schema;
      } catch (error) {
        if (cache) {
          cachedSchema = cache;
          return cache.schema;
        }
        throw error;
      }
    },

    getCachedSchema(): object | null {
      return cachedSchema?.schema || null;
    }
  };
}
