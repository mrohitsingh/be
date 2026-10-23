import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Environment, validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('should validate valid configuration and apply defaults', () => {
    const config = validateEnv({});
    expect(config.NODE_ENV).toBe(Environment.Development);
    expect(config.PORT).toBe(8082);
    expect(config.API_PREFIX).toBe('api/v1');
    expect(config.FRONTEND_URL).toBe('http://localhost:3000');
  });

  it('should parse and coerce string PORT to integer', () => {
    const config = validateEnv({ PORT: '8080' });
    expect(config.PORT).toBe(8080);
  });

  it('should throw error when NODE_ENV is invalid', () => {
    expect(() => {
      validateEnv({ NODE_ENV: 'invalid_env' });
    }).toThrow(/Environment validation error/);
  });
});
