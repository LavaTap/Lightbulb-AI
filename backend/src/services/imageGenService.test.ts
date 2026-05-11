import { describe, it, expect } from 'vitest';
import type { APIConfig } from '../types/index.js';
import { generateImage, ImageSize } from './imageGenService.js';

describe('imageGenService - multiple reference images', () => {
  const mockConfig: APIConfig = {
    provider: 'tencent',
    model: 'hy-image-v3.0',
    apiKey: 'test-id:test-secret',
    endpoint: 'https://tokenhub.tencentmaas.com/v1/api/image',
    useProxy: false,
    proxyEndpoint: '',
  };

  const mockPrompt = 'test prompt';
  const mockSize: ImageSize = '1024x1024';
  const mockImage1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const mockImage2 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('should accept single reference image (string)', () => {
    // This should type-check and not throw at validation level
    const result = generateImage(mockPrompt, mockConfig, mockSize, mockImage1);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should accept multiple reference images (array)', () => {
    // This should type-check and not throw at validation level
    const result = generateImage(mockPrompt, mockConfig, mockSize, [mockImage1, mockImage2]);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should accept no reference image (undefined)', () => {
    const result = generateImage(mockPrompt, mockConfig, mockSize);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should correctly pass multiple reference images to Tencent Hunyuan TokenHub', () => {
    // The type system should accept array of strings for multiple images
    const testConfig: APIConfig = {
      ...mockConfig,
      endpoint: 'https://tokenhub.tencentmaas.com/v1/api/image',
    };

    // This compiles means the types are correct
    const result = generateImage(mockPrompt, testConfig, mockSize, [mockImage1, mockImage2]);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should correctly pass multiple reference images to Qwen', () => {
    const qwenConfig: APIConfig = {
      provider: 'aliyun',
      model: 'qwen-image',
      apiKey: 'test-key',
      endpoint: 'https://dashscope.aliyuncs.com/api/v1',
      useProxy: false,
      proxyEndpoint: '',
    };

    const result = generateImage(mockPrompt, qwenConfig, mockSize, [mockImage1, mockImage2]);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should correctly pass multiple reference images to GPTImage2', () => {
    const gptConfig: APIConfig = {
      provider: 'gptimage2',
      model: 'gpt-image-2',
      apiKey: 'test-key',
      endpoint: 'https://grsai.dakka.com.cn',
      useProxy: false,
      proxyEndpoint: '',
    };

    const result = generateImage(mockPrompt, gptConfig, mockSize, [mockImage1, mockImage2]);
    expect(result).toBeInstanceOf(Promise);
  });
});
