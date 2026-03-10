import { describe, it, expect } from 'vitest';
import { createValidator } from './validator.js';

describe('Validator', () => {
  const validator = createValidator();

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      count: { type: 'integer' },
      enabled: { type: 'boolean' }
    },
    required: ['name'],
    additionalProperties: false
  };

  it('should return no errors for valid config', async () => {
    const config = { name: 'test', count: 5, enabled: true };
    const errors = await validator.validate(config, schema);
    expect(errors).toEqual([]);
  });

  it('should return error for missing required field', async () => {
    const config = { count: 5 };
    const errors = await validator.validate(config, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('/');
    expect(errors[0].message).toContain('name');
  });

  it('should return error for wrong type', async () => {
    const config = { name: 123 };
    const errors = await validator.validate(config, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('string');
  });

  it('should return error for additional properties', async () => {
    const config = { name: 'test', unknown: 'field' };
    const errors = await validator.validate(config, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('additional properties');
  });

  it('should return multiple errors for multiple issues', async () => {
    const config = { unknown: 'field' };
    const errors = await validator.validate(config, schema);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should validate schemas using draft 2020-12', async () => {
    const draft2020Schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        model: { type: 'string' }
      },
      required: ['model'],
      additionalProperties: false
    };

    await expect(validator.validate({ model: 'openai/gpt-5.4' }, draft2020Schema)).resolves.toEqual([]);
  });

  it('should allow non-standard ref keys in fetched schemas', async () => {
    const schemaWithRefAnnotations = {
      type: 'object',
      ref: 'Config',
      properties: {
        mode: {
          type: 'object',
          ref: 'ModeConfig',
          properties: {
            build: {
              type: 'object',
              ref: 'AgentConfig',
              properties: {
                model: { type: 'string' }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    };

    await expect(validator.validate({ mode: { build: { model: 'openai/gpt-5.4' } } }, schemaWithRefAnnotations)).resolves.toEqual([]);
  });

  it('should validate a simple config against the canonical OpenCode schema', async () => {
    const canonicalSchema = await fetch('https://opencode.ai/config.json').then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch canonical schema: ${response.status}`);
      }

      return await response.json() as object;
    });

    await expect(validator.validate({ share: 'manual' }, canonicalSchema)).resolves.toEqual([]);
  });
});
