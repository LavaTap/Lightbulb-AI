import { describe, it, expect } from 'vitest';
import { generateImageSchema } from './validateRequest.js';

describe('validateRequest - generateImageSchema with multiple reference images', () => {
  const validBase = {
    prompt: 'test prompt',
    config: {
      provider: 'tencent',
      model: 'hy-image-v3.0',
      apiKey: 'test-key',
    },
  };

  it('should validate when referenceImage is a single string', () => {
    const result = generateImageSchema.safeParse({
      ...validBase,
      referenceImage: 'base64-string',
    });
    expect(result.success).toBe(true);
  });

  it('should validate when referenceImage is an array of strings', () => {
    const result = generateImageSchema.safeParse({
      ...validBase,
      referenceImage: ['base64-1', 'base64-2', 'base64-3'],
    });
    expect(result.success).toBe(true);
  });

  it('should validate when referenceImage is undefined', () => {
    const result = generateImageSchema.safeParse({
      ...validBase,
    });
    expect(result.success).toBe(true);
  });

  it('should reject when referenceImage contains non-string values', () => {
    const result = generateImageSchema.safeParse({
      ...validBase,
      referenceImage: ['string', 123, null],
    });
    expect(result.success).toBe(false);
  });

  it('should reject when referenceImage is a number', () => {
    const result = generateImageSchema.safeParse({
      ...validBase,
      referenceImage: 12345,
    });
    expect(result.success).toBe(false);
  });

  it('should accept empty array for referenceImage', () => {
    // Zod allows empty array, the service handles it as undefined
    const result = generateImageSchema.safeParse({
      ...validBase,
      referenceImage: [],
    });
    expect(result.success).toBe(true);
  });

  it('should work with storyboard use case - 3 reference images', () => {
    const result = generateImageSchema.safeParse({
      prompt: 'storyboard prompt',
      size: '2560x1440',
      config: {
        provider: 'tencent',
        model: 'hy-image-v3.0',
        apiKey: 'test-key',
      },
      referenceImage: ['char1-base64', 'char2-base64', 'scene-base64'],
    });
    expect(result.success).toBe(true);
  });
});
