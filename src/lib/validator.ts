import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ValidationError } from '../types.js';

export interface ValidatorOperations {
  validate(config: Record<string, unknown>, schema: object): Promise<ValidationError[]>;
}

export function createValidator(): ValidatorOperations {
  const ajv = new Ajv2020({
    allErrors: true,
    verbose: true,
    loadSchema: async (uri: string): Promise<object> => {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch remote schema: ${response.status} ${uri}`);
      }

      return await response.json() as object;
    }
  });
  addFormats(ajv);
  ajv.addKeyword({ keyword: 'ref', schemaType: 'string' });
  ajv.addKeyword({ keyword: 'allowComments', schemaType: 'boolean' });
  ajv.addKeyword({ keyword: 'allowTrailingCommas', schemaType: 'boolean' });

  return {
    async validate(config: Record<string, unknown>, schema: object): Promise<ValidationError[]> {
      const validateFn = await ajv.compileAsync(schema);
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
