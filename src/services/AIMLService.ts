import axios from 'axios';
import FormData from 'form-data';

export interface AIMLConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
  timeout?: number;
  retryAttempts?: number;
  [key: string]: any;
}

export interface AIMLResult {
  content?: any;
  data?: any;
  metadata?: any;
  usage?: any;
  error?: string;
}

export class AIMLService {
  private config: AIMLConfig;
  
  constructor(config: AIMLConfig) {
    this.config = config;
  }

  async makeRequest(url: string, data: any, headers: any = {}): Promise<any> {
    const { timeout = 60000, retryAttempts = 3 } = this.config;
    
    let attempt = 0;
    while (attempt <= retryAttempts) {
      try {
        const response = await axios.post(url, data, {
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          timeout,
        });
        
        return response.data;
      } catch (error) {
        attempt++;
        if (attempt > retryAttempts) {
          throw new Error(`API request failed after ${retryAttempts} retries: ${error.response?.data?.error?.message || error.message}`);
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
}

export class OpenAIService extends AIMLService {
  private baseURL = 'https://api.openai.com/v1';

  async chatCompletion(messages: any[], options: any = {}): Promise<AIMLResult> {
    const {
      model = 'gpt-4',
      maxTokens = 1000,
      temperature = 0.7,
      stream = false,
    } = options;

    const data = await this.makeRequest(`${this.baseURL}/chat/completions`, {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }, {
      'Authorization': `Bearer ${this.config.apiKey}`,
    });

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
        finishReason: data.choices[0].finish_reason,
      },
    };
  }

  async generateImage(prompt: string, options: any = {}): Promise<AIMLResult> {
    const {
      model = 'dall-e-3',
      size = '1024x1024',
      n = 1,
      quality = 'standard',
    } = options;

    const data = await this.makeRequest(`${this.baseURL}/images/generations`, {
      model,
      prompt,
      size,
      n,
      quality,
    }, {
      'Authorization': `Bearer ${this.config.apiKey}`,
    });

    return {
      data: data.data,
      content: data.data.map((img: any) => img.url),
      metadata: {
        model,
        prompt,
        size,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async transcribeAudio(audioFile: Buffer, options: any = {}): Promise<AIMLResult> {
    const {
      model = 'whisper-1',
      language,
      response_format = 'json',
      temperature = 0,
    } = options;

    const formData = new FormData();
    formData.append('file', audioFile, 'audio.mp3');
    formData.append('model', model);
    formData.append('response_format', response_format);
    formData.append('temperature', temperature.toString());
    
    if (language) {
      formData.append('language', language);
    }

    const response = await axios.post(`${this.baseURL}/audio/transcriptions`, formData, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        ...formData.getHeaders(),
      },
      timeout: this.config.timeout,
    });

    return {
      content: response.data.text,
      data: response.data,
      metadata: {
        model,
        language: response.data.language,
        duration: response.data.duration,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async generateSpeech(text: string, options: any = {}): Promise<AIMLResult> {
    const {
      model = 'tts-1',
      voice = 'alloy',
      response_format = 'mp3',
      speed = 1.0,
    } = options;

    const response = await axios.post(`${this.baseURL}/audio/speech`, {
      model,
      input: text,
      voice,
      response_format,
      speed,
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      responseType: 'arraybuffer',
      timeout: this.config.timeout,
    });

    return {
      content: Buffer.from(response.data).toString('base64'),
      data: response.data,
      metadata: {
        model,
        voice,
        format: response_format,
        size: response.data.byteLength,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async createEmbedding(input: string | string[], options: any = {}): Promise<AIMLResult> {
    const {
      model = 'text-embedding-ada-002',
      encoding_format = 'float',
    } = options;

    const data = await this.makeRequest(`${this.baseURL}/embeddings`, {
      model,
      input,
      encoding_format,
    }, {
      'Authorization': `Bearer ${this.config.apiKey}`,
    });

    return {
      content: data.data[0].embedding,
      data: data.data,
      usage: data.usage,
      metadata: {
        model,
        dimensions: data.data[0].embedding.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  calculateCost(model: string, usage: any): number {
    const pricing = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'text-embedding-ada-002': { input: 0.0001, output: 0 },
      'text-embedding-3-small': { input: 0.00002, output: 0 },
      'text-embedding-3-large': { input: 0.00013, output: 0 },
      'dall-e-3': { '1024x1024': 0.04, '1792x1024': 0.08, '1024x1792': 0.08 },
      'whisper-1': { per_minute: 0.006 },
      'tts-1': { per_1k_chars: 0.015 },
    };

    const modelPricing = pricing[model];
    if (!modelPricing) return 0;

    if (usage.prompt_tokens && usage.completion_tokens) {
      const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
      const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
      return inputCost + outputCost;
    }

    return 0;
  }
}

export class AnthropicService extends AIMLService {
  private baseURL = 'https://api.anthropic.com/v1';

  async createMessage(messages: any[], options: any = {}): Promise<AIMLResult> {
    const {
      model = 'claude-3-sonnet-20240229',
      maxTokens = 1000,
      temperature = 0.7,
      system,
    } = options;

    const data = await this.makeRequest(`${this.baseURL}/messages`, {
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages,
    }, {
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    });

    return {
      content: data.content[0].text,
      usage: data.usage,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
        stopReason: data.stop_reason,
      },
    };
  }
}

export class GoogleAIService extends AIMLService {
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  async generateContent(prompt: string, options: any = {}): Promise<AIMLResult> {
    const {
      model = 'gemini-pro',
      temperature = 0.7,
      maxTokens = 1000,
    } = options;

    const data = await this.makeRequest(`${this.baseURL}/models/${model}:generateContent`, {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }, {
      'x-goog-api-key': this.config.apiKey,
    });

    return {
      content: data.candidates[0].content.parts[0].text,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
        safety: data.candidates[0].safetyRatings,
      },
    };
  }
}

export class HuggingFaceService extends AIMLService {
  private baseURL = 'https://api-inference.huggingface.co/models';

  async query(model: string, inputs: any, options: any = {}): Promise<AIMLResult> {
    const response = await axios.post(`${this.baseURL}/${model}`, {
      inputs,
      options,
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      timeout: this.config.timeout,
    });

    return {
      content: response.data,
      data: response.data,
      metadata: {
        model,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async textGeneration(model: string, prompt: string, options: any = {}): Promise<AIMLResult> {
    return this.query(model, prompt, {
      max_length: options.maxTokens || 100,
      temperature: options.temperature || 0.7,
      ...options,
    });
  }

  async imageClassification(model: string, imageUrl: string): Promise<AIMLResult> {
    return this.query(model, imageUrl);
  }

  async sentimentAnalysis(model: string, text: string): Promise<AIMLResult> {
    return this.query(model, text);
  }
}

export class AIMLServiceFactory {
  static createService(provider: string, config: AIMLConfig): AIMLService {
    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIService(config);
      case 'anthropic':
        return new AnthropicService(config);
      case 'google':
        return new GoogleAIService(config);
      case 'huggingface':
        return new HuggingFaceService(config);
      default:
        return new AIMLService(config);
    }
  }
}