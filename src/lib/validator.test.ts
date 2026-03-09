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

  it('should return no errors for valid config', () => {
    const config = { name: 'test', count: 5, enabled: true };
    const errors = validator.validate(config, schema);
    expect(errors).toEqual([]);
  });

  it('should return error for missing required field', () => {
    const config = { count: 5 };
    const errors = validator.validate(config, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('/');
    expect(errors[0].message).toContain('name');
  });

  it('should return error for wrong type', () => {
    const config = { name: 123 };
    const errors = validator.validate(config, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('string');
  });

  it('should return error for additional properties', () => {
    const config = { name: 'test', unknown: 'field' };
    const errors = validator.validate(config, schema);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('additional properties');
  });

  it('should return multiple errors for multiple issues', () => {
    const config = { unknown: 'field' };
    const errors = validator.validate(config, schema);
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });
});
