import { useState, useCallback } from 'react';
import { visionApi, imageApi, posterApi, recordsApi } from '@/services/api';
import { getCurrentProvider, getConfig } from '@/services/storage';
import type { APIConfig, VisionAnalysisResult, AnalysisCategory } from '@/types';
import type { CreateRecordRequest } from '@/types/api';

function resolveConfig(overrideConfig?: APIConfig): APIConfig | null {
  if (overrideConfig) return overrideConfig;
  const provider = getCurrentProvider();
  return getConfig(provider);
}

interface UseGenerationReturn {
  isLoading: boolean;
  error: string | null;
  analyze: (imageBase64: string, category?: AnalysisCategory, config?: APIConfig) => Promise<VisionAnalysisResult>;
  generate: (prompt: string, size?: '1024x1024' | '1024x1792' | '1792x1024', config?: APIConfig) => Promise<string>;
  generateThreeView: (referenceImage: string, analysisPrompt: string, userPrompt?: string, config?: APIConfig) => Promise<string[]>;
  generatePoster: (images: string[], prompt: string, size?: '1024x1024' | '1024x1792' | '1792x1024', config?: APIConfig) => Promise<string>;
  clearError: () => void;
}

export function useGeneration(): UseGenerationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const saveRecord = useCallback(async (data: Partial<CreateRecordRequest>) => {
    try {
      await recordsApi.create(data as CreateRecordRequest);
    } catch (e) {
      console.error('Failed to save record:', e);
    }
  }, []);

  const analyze = useCallback(async (imageBase64: string, category?: AnalysisCategory, overrideConfig?: APIConfig): Promise<VisionAnalysisResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const config = resolveConfig(overrideConfig);

      if (!config) {
        throw new Error('请先配置 API Key');
      }

      const response = await visionApi.analyze({ imageBase64, config, category });

      const compressedImage = await compressImageAsBase64(imageBase64, 200, 0.7);

      const promptText = JSON.stringify(response.data, null, 2);

      await saveRecord({
        featureType: 'inspiration',
        prompt: promptText,
        uploadImages: compressedImage,
        uploadImagesOriginal: imageBase64,
        modelProvider: config.provider,
        modelName: config.model,
        tokenUsage: response.tokenUsage,
      });

      return response.data;
    } catch (e: any) {
      const message = e.message || '分析失败';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [saveRecord]);

  const generate = useCallback(async (
    prompt: string,
    size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024',
    overrideConfig?: APIConfig
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const config = resolveConfig(overrideConfig);

      if (!config) {
        throw new Error('请先配置 API Key');
      }

      const response = await imageApi.generate({ prompt, config, size });

      const compressedImage = await compressImageAsBase64(response.data.imageBase64, 200, 0.7);

      await saveRecord({
        featureType: 'character',
        prompt,
        generatedImages: compressedImage,
        generatedImagesOriginal: response.data.imageBase64,
        modelProvider: config.provider,
        modelName: config.model,
        tokenUsage: response.tokenUsage,
      });

      return response.data.imageBase64;
    } catch (e: any) {
      const message = e.message || '生成失败';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [saveRecord]);

  const generateThreeView = useCallback(async (
    referenceImage: string,
    analysisPrompt: string,
    userPrompt?: string,
    overrideConfig?: APIConfig
  ): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const config = resolveConfig(overrideConfig);

      if (!config) {
        throw new Error('请先配置 API Key');
      }

      let totalTokenUsage = 0;

      const compressedRef = await compressImageAsBase64(referenceImage, 200, 0.7);

      const basePrompt = userPrompt?.trim() || analysisPrompt;

      const prompt = `${basePrompt}, character design sheet`;
      const response = await imageApi.generate({
        prompt,
        config,
        size: '2560x1440',
        referenceImage: referenceImage
      });
      const image = response.data.imageBase64;
      totalTokenUsage += response.tokenUsage;

      const compressed = await compressImageAsBase64(image, 200, 0.7);

      await saveRecord({
        featureType: 'threeview',
        prompt: basePrompt,
        uploadImages: compressedRef,
        uploadImagesOriginal: referenceImage,
        generatedImages: compressed,
        generatedImagesOriginal: image,
        modelProvider: config.provider,
        modelName: config.model,
        tokenUsage: totalTokenUsage,
      });

      return [image];
    } catch (e: any) {
      const message = e.message || '生成失败';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [saveRecord]);

  const generatePoster = useCallback(async (images: string[], prompt: string, size?: '1024x1024' | '1024x1792' | '1792x1024', overrideConfig?: APIConfig): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const config = resolveConfig(overrideConfig);

      if (!config) {
        throw new Error('请先配置 API Key');
      }

      const response = await posterApi.generate({ images, prompt, config, size });

      const compressedUpload = await compressImageAsBase64(images[0], 200, 0.7);
      const compressedGenerated = await compressImageAsBase64(response.data.imageBase64, 200, 0.7);

      await saveRecord({
        featureType: 'poster',
        prompt,
        uploadImages: compressedUpload,
        uploadImagesOriginal: images[0],
        generatedImages: compressedGenerated,
        generatedImagesOriginal: response.data.imageBase64,
        modelProvider: config.provider,
        modelName: config.model,
        tokenUsage: response.tokenUsage,
      });

      return response.data.imageBase64;
    } catch (e: any) {
      const message = e.message || '生成失败';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [saveRecord]);

  return { isLoading, error, analyze, generate, generateThreeView, generatePoster, clearError };
}

async function compressImageAsBase64(base64: string, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64.substring(0, 100000));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(base64.substring(0, 100000));
    };

    img.src = `data:image/jpeg;base64,${base64}`;
  });
}
