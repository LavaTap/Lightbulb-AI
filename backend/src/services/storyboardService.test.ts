import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIConfig } from '../types/index.js';
import { generateStoryboard } from './storyboardService.js';

// Mock the dependencies
vi.mock('./imageGenService.js', () => ({
  generateImage: vi.fn().mockResolvedValue({
    imageBase64: 'mock-base64-result',
    tokenUsage: 10,
  }),
}));

vi.mock('./visionService.js', () => ({
  analyzeImage: vi.fn().mockResolvedValue({
    result: {
      analysis: {
        en: 'character analysis result',
        zh: '角色分析结果',
      },
    },
    tokenUsage: 5,
  }),
}));

const { generateImage } = await import('./imageGenService.js');
const mockGenerateImage = vi.mocked(generateImage);

beforeEach(() => {
  mockGenerateImage.mockClear();
});

describe('storyboardService - multiple reference images', () => {
  const mockConfig: APIConfig = {
    provider: 'tencent',
    model: 'hy-image-v3.0',
    apiKey: 'test-key',
    endpoint: 'https://tokenhub.tencentmaas.com/v1/api/image',
    useProxy: false,
    proxyEndpoint: '',
  };

  const mockImage1 = 'mock-image-1';
  const mockImage2 = 'mock-image-2';
  const mockScene = 'mock-scene';
  const mockPrompt = 'Test battle between hero and villain';

  it('should pass all character images when no scene', async () => {
    await generateStoryboard([mockImage1, mockImage2], undefined, mockPrompt, mockConfig);

    // Should be called with array containing both images
    expect(mockGenerateImage).toHaveBeenCalled();
    const callArgs = mockGenerateImage.mock.calls[0];
    expect(callArgs[3]).toEqual([mockImage1, mockImage2]);
  });

  it('should pass all character images + scene image when scene provided', async () => {
    await generateStoryboard([mockImage1, mockImage2], mockScene, mockPrompt, mockConfig);

    // Should be called with array containing both characters + scene
    expect(mockGenerateImage).toHaveBeenCalled();
    const callArgs = mockGenerateImage.mock.calls[0];
    expect(callArgs[3]).toEqual([mockImage1, mockImage2, mockScene]);
  });

  it('should work with single character image + no scene', async () => {
    await generateStoryboard([mockImage1], undefined, mockPrompt, mockConfig);

    expect(mockGenerateImage).toHaveBeenCalled();
    const callArgs = mockGenerateImage.mock.calls[0];
    expect(callArgs[3]).toEqual([mockImage1]);
  });

  it('should work with single character image + scene', async () => {
    await generateStoryboard([mockImage1], mockScene, mockPrompt, mockConfig);

    expect(mockGenerateImage).toHaveBeenCalled();
    const callArgs = mockGenerateImage.mock.calls[0];
    expect(callArgs[3]).toEqual([mockImage1, mockScene]);
  });

  it('should work with no reference images at all', async () => {
    await generateStoryboard([], undefined, mockPrompt, mockConfig);

    expect(mockGenerateImage).toHaveBeenCalled();
    const callArgs = mockGenerateImage.mock.calls[0];
    expect(callArgs[3]).toBeUndefined();
  });

  it('should return base64 image and accumulated token usage', async () => {
    const result = await generateStoryboard([mockImage1, mockImage2], mockScene, mockPrompt, mockConfig);

    expect(result.imageBase64).toBe('mock-base64-result');
    expect(result.tokenUsage).toBeGreaterThan(0);
  });
});
