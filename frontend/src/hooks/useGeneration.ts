import { useState, useCallback } from 'react';
import { visionApi, imageApi, posterApi, recordsApi } from '@/services/api';
import { getCurrentProvider, getConfig } from '@/services/storage';
import type { VisionAnalysisResult } from '@/types';
import type { CreateRecordRequest } from '@/types/api';

interface UseGenerationReturn {
  isLoading: boolean;
  error: string | null;
  analyze: (imageBase64: string) => Promise<VisionAnalysisResult>;
  generate: (prompt: string, size?: '1024x1024' | '1024x1792' | '1792x1024') => Promise<string>;
  generateThreeView: (referenceImage: string, analysisPrompt: string, userPrompt?: string) => Promise<string[]>;
  generatePoster: (images: string[], prompt: string) => Promise<string>;
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

  const analyze = useCallback(async (imageBase64: string): Promise<VisionAnalysisResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = getCurrentProvider();
      const config = getConfig(provider);
      
      if (!config) {
        throw new Error('请先配置 API Key');
      }
      
      const response = await visionApi.analyze({ imageBase64, config });
      
      // Compress upload image for storage (200px thumbnail)
      const compressedImage = await compressImageAsBase64(imageBase64, 200, 0.7);
      
      // Store analysis result as prompt for inspiration records
      const promptText = JSON.stringify(response.data, null, 2);
      
      await saveRecord({
        featureType: 'inspiration',
        prompt: promptText,
        uploadImages: compressedImage,
        modelProvider: 'qwen-vl-plus',
        modelName: 'qwen-vl-plus',
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
    size: '1024x1024' | '1024x1792' | '1792x1024' = '1024x1024'
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = getCurrentProvider();
      const config = getConfig(provider);
      
      if (!config) {
        throw new Error('请先配置 API Key');
      }
      
      const response = await imageApi.generate({ prompt, config, size });
      
      // Compress generated image for storage (200px thumbnail)
      const compressedImage = await compressImageAsBase64(response.data.imageBase64, 200, 0.7);
      
      await saveRecord({
        featureType: 'character',
        prompt,
        generatedImages: compressedImage,
        modelProvider: provider,
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
    userPrompt?: string
  ): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = getCurrentProvider();
      const config = getConfig(provider);
      
      if (!config) {
        throw new Error('请先配置 API Key');
      }
      
      const images: string[] = [];
      const views = ['front view', 'side view', 'back view'];
      let totalTokenUsage = 0;
      
      // Compress reference image for storage
      const compressedRef = await compressImageAsBase64(referenceImage, 200, 0.7);
      
      // 使用用户输入的提示词优先，否则使用AI分析结果
      const basePrompt = userPrompt?.trim() || analysisPrompt;
      
      for (const view of views) {
        const prompt = `${basePrompt}, ${view}, character design sheet`;
        const response = await imageApi.generate({ 
          prompt, 
          config, 
          size: '1024x1024',
          referenceImage: referenceImage  // 传入参考图支持图生图
        });
        images.push(response.data.imageBase64);
        totalTokenUsage += response.tokenUsage;
      }
      
      // Compress all generated images and join with separator
      const compressedImages = images.map(img => compressImageAsBase64(img, 200, 0.7));
      const compressed = await Promise.all(compressedImages);
      
      await saveRecord({
        featureType: 'threeview',
        prompt: basePrompt,
        uploadImages: compressedRef,
        generatedImages: compressed.join(','),
        modelProvider: provider,
        modelName: config.model,
        tokenUsage: totalTokenUsage,
      });
      
      return images;
    } catch (e: any) {
      const message = e.message || '生成失败';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [saveRecord]);

  const generatePoster = useCallback(async (images: string[], prompt: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const provider = getCurrentProvider();
      const config = getConfig(provider);
      
      if (!config) {
        throw new Error('请先配置 API Key');
      }
      
      const response = await posterApi.generate({ images, prompt, config });
      
      // Compress both upload and generated images
      const compressedUpload = await compressImageAsBase64(images[0], 200, 0.7);
      const compressedGenerated = await compressImageAsBase64(response.data.imageBase64, 200, 0.7);
      
      await saveRecord({
        featureType: 'poster',
        prompt,
        uploadImages: compressedUpload,
        generatedImages: compressedGenerated,
        modelProvider: provider,
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

// Helper function to compress base64 image
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
