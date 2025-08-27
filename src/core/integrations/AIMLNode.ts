import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { INodeTypeDescription } from '../../types/workflow.types';
import { AIMLServiceFactory } from '../../services/AIMLService';

export class AIMLNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AI/ML',
    name: 'aiml',
    group: ['ai', 'transform'],
    version: 1,
    description: 'Integrate with AI/ML services for text, image, audio processing and more',
    defaults: {
      name: 'AI/ML',
      color: '#9b59b6',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        name: 'service',
        displayName: 'AI/ML Service',
        type: 'options',
        options: [
          { name: 'OpenAI (GPT, DALL-E, Whisper)', value: 'openai' },
          { name: 'Anthropic (Claude)', value: 'anthropic' },
          { name: 'Google AI (Gemini, PaLM)', value: 'google' },
          { name: 'Hugging Face', value: 'huggingface' },
        ],
        default: 'openai',
        description: 'Choose the AI/ML service provider',
      },
      {
        name: 'taskType',
        displayName: 'Task Type',
        type: 'options',
        options: [
          { name: 'Text Processing', value: 'text' },
          { name: 'Image Processing', value: 'image' },
          { name: 'Audio Processing', value: 'audio' },
          { name: 'Embeddings', value: 'embedding' },
        ],
        default: 'text',
        description: 'Type of AI/ML task to perform',
      },
      {
        name: 'apiKey',
        displayName: 'API Key',
        type: 'string',
        default: '',
        required: true,
        description: 'API key for the selected service',
      },
      {
        name: 'model',
        displayName: 'Model',
        type: 'string',
        default: 'gpt-4',
        description: 'AI/ML model to use',
      },
      {
        name: 'inputField',
        displayName: 'Input Field',
        type: 'string',
        default: 'text',
        description: 'Field containing the input data to process',
      },
      {
        name: 'outputField',
        displayName: 'Output Field',
        type: 'string',
        default: 'aiResult',
        description: 'Field to store the AI/ML result',
      },
      {
        name: 'prompt',
        displayName: 'Prompt',
        type: 'string',
        default: '',
        description: 'Prompt or instruction for the AI model',
      },
      {
        name: 'maxTokens',
        displayName: 'Max Tokens',
        type: 'number',
        default: 1000,
        description: 'Maximum number of tokens to generate',
      },
      {
        name: 'temperature',
        displayName: 'Temperature',
        type: 'number',
        default: 0.7,
        description: 'Controls randomness (0-2)',
      },
      {
        name: 'includeMetadata',
        displayName: 'Include Metadata',
        type: 'boolean',
        default: true,
        description: 'Include usage and cost information',
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const service = this.getNodeParameter('service', 0) as string;
    const taskType = this.getNodeParameter('taskType', 0) as string;
    const apiKey = this.getNodeParameter('apiKey', 0) as string;
    const model = this.getNodeParameter('model', 0) as string;
    const inputField = this.getNodeParameter('inputField', 0, 'text') as string;
    const outputField = this.getNodeParameter('outputField', 0, 'aiResult') as string;
    const prompt = this.getNodeParameter('prompt', 0, '') as string;
    const maxTokens = this.getNodeParameter('maxTokens', 0, 1000) as number;
    const temperature = this.getNodeParameter('temperature', 0, 0.7) as number;
    const includeMetadata = this.getNodeParameter('includeMetadata', 0, true) as boolean;

    const items = this.getInputData();
    const results = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      try {
        const inputData = item.json[inputField];
        
        if (!inputData) {
          throw new Error(`Input field "${inputField}" not found in item data`);
        }

        const aiService = AIMLServiceFactory.createService(service, {
          apiKey,
          model,
          timeout: 60000,
          retryAttempts: 3,
        });

        let result;
        
        switch (taskType) {
          case 'text':
            if (service === 'openai') {
              const messages = [
                { role: 'system', content: prompt || 'You are a helpful assistant.' },
                { role: 'user', content: inputData.toString() }
              ];
              result = await (aiService as any).chatCompletion(messages, {
                model,
                maxTokens,
                temperature,
              });
            } else if (service === 'anthropic') {
              const messages = [
                { role: 'user', content: inputData.toString() }
              ];
              result = await (aiService as any).createMessage(messages, {
                model,
                maxTokens,
                temperature,
                system: prompt || 'You are a helpful assistant.',
              });
            } else {
              throw new Error(`Text processing not implemented for service: ${service}`);
            }
            break;

          case 'embedding':
            if (service === 'openai') {
              result = await (aiService as any).createEmbedding(inputData.toString(), {
                model: model || 'text-embedding-ada-002',
              });
            } else {
              throw new Error(`Embedding generation not implemented for service: ${service}`);
            }
            break;

          default:
            throw new Error(`Task type "${taskType}" not yet implemented`);
        }

        const outputItem = {
          json: {
            ...item.json,
            [outputField]: result.content,
            ...(includeMetadata && result.metadata ? { aiMetadata: result.metadata } : {}),
            ...(includeMetadata && result.usage ? { aiUsage: result.usage } : {}),
          },
        };

        results.push(outputItem);
      } catch (error) {
        if (this.continueOnFail && this.continueOnFail()) {
          results.push({
            json: {
              ...item.json,
              [outputField]: null,
              error: error.message,
            },
          });
        } else {
          throw error;
        }
      }
    }

    return results;
  }
}