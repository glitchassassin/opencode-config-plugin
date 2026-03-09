import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ValidationError } from '../types.js';

export interface ValidatorOperations {
  validate(config: Record<string, unknown>, schema: object): ValidationError[];
}

export function createValidator(): ValidatorOperations {
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);

  return {
    validate(config: Record<string, unknown>, schema: object): ValidationError[] {
      const validateFn = ajv.compile(schema);
      const valid = validateFn(config);

      if (valid) {
        return [];
      }

      const errors: ValidationError[] = [];
      if (validateFn.errors) {
        for (const error of validateFn.errors) {
          errors.push({
            path: error.instancePath || '/',
            message: error.message || 'validation error'
          });
        }
      }

      return errors;
    }
  };
}
