import { z } from 'zod';
export declare const analysisCategorySchema: z.ZodEnum<["character", "landscape", "object", "other"]>;
export type AnalysisCategory = z.infer<typeof analysisCategorySchema>;
export declare const analyzeSchema: z.ZodObject<{
    imageBase64: z.ZodString;
    config: z.ZodObject<{
        provider: z.ZodEnum<["openai", "google", "deepseek", "xfyun", "custom"]>;
        model: z.ZodString;
        endpoint: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodString;
        useProxy: z.ZodOptional<z.ZodBoolean>;
        proxyEndpoint: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    }, {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    }>;
    category: z.ZodOptional<z.ZodEnum<["character", "landscape", "object", "other"]>>;
}, "strip", z.ZodTypeAny, {
    imageBase64: string;
    config: {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    };
    category?: "object" | "character" | "landscape" | "other" | undefined;
}, {
    imageBase64: string;
    config: {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    };
    category?: "object" | "character" | "landscape" | "other" | undefined;
}>;
export declare const generateImageSchema: z.ZodObject<{
    prompt: z.ZodString;
    config: z.ZodObject<{
        provider: z.ZodEnum<["openai", "google", "deepseek", "xfyun", "custom"]>;
        model: z.ZodString;
        endpoint: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodString;
        useProxy: z.ZodOptional<z.ZodBoolean>;
        proxyEndpoint: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    }, {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    }>;
    size: z.ZodOptional<z.ZodEnum<["1024x1024", "1024x1792", "1792x1024"]>>;
    referenceImage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    config: {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    };
    prompt: string;
    size?: "1024x1024" | "1024x1792" | "1792x1024" | undefined;
    referenceImage?: string | undefined;
}, {
    config: {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    };
    prompt: string;
    size?: "1024x1024" | "1024x1792" | "1792x1024" | undefined;
    referenceImage?: string | undefined;
}>;
export declare const generatePosterSchema: z.ZodObject<{
    images: z.ZodArray<z.ZodString, "many">;
    prompt: z.ZodString;
    config: z.ZodObject<{
        provider: z.ZodEnum<["openai", "google", "deepseek", "xfyun", "custom"]>;
        model: z.ZodString;
        endpoint: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodString;
        useProxy: z.ZodOptional<z.ZodBoolean>;
        proxyEndpoint: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    }, {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    config: {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    };
    prompt: string;
    images: string[];
}, {
    config: {
        provider: "custom" | "openai" | "google" | "deepseek" | "xfyun";
        model: string;
        apiKey: string;
        endpoint?: string | undefined;
        useProxy?: boolean | undefined;
        proxyEndpoint?: string | undefined;
    };
    prompt: string;
    images: string[];
}>;
export declare const createRecordSchema: z.ZodObject<{
    featureType: z.ZodString;
    prompt: z.ZodOptional<z.ZodString>;
    uploadImages: z.ZodOptional<z.ZodString>;
    generatedImages: z.ZodOptional<z.ZodString>;
    uploadImagesOriginal: z.ZodOptional<z.ZodString>;
    generatedImagesOriginal: z.ZodOptional<z.ZodString>;
    modelProvider: z.ZodString;
    modelName: z.ZodString;
    tokenUsage: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    featureType: string;
    modelProvider: string;
    modelName: string;
    tokenUsage: number;
    prompt?: string | undefined;
    uploadImages?: string | undefined;
    generatedImages?: string | undefined;
    uploadImagesOriginal?: string | undefined;
    generatedImagesOriginal?: string | undefined;
}, {
    featureType: string;
    modelProvider: string;
    modelName: string;
    tokenUsage: number;
    prompt?: string | undefined;
    uploadImages?: string | undefined;
    generatedImages?: string | undefined;
    uploadImagesOriginal?: string | undefined;
    generatedImagesOriginal?: string | undefined;
}>;
//# sourceMappingURL=validateRequest.d.ts.map