import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { INodeTypeDescription } from '../../types/workflow.types';

export class MergeNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Merge',
    name: 'merge',
    group: ['transform'],
    version: 1,
    description: 'Merge data from multiple inputs using various strategies',
    defaults: {
      name: 'Merge',
      color: '#66cc99',
    },
    inputs: ['main', 'main'],
    outputs: ['main'],
    properties: [
      {
        name: 'mode',
        displayName: 'Mode',
        type: 'options',
        options: [
          { name: 'Append', value: 'append' },
          { name: 'Merge by Index', value: 'mergeByIndex' },
          { name: 'Merge by Key', value: 'mergeByKey' },
          { name: 'Multiplex', value: 'multiplex' },
          { name: 'Combine', value: 'combine' },
          { name: 'Wait', value: 'wait' },
          { name: 'Choose Branch', value: 'chooseBranch' },
        ],
        default: 'append',
        description: 'How to merge the data from multiple inputs',
      },
      
      // Merge by key settings
      {
        name: 'propertyName1',
        displayName: 'Property Name (Input 1)',
        type: 'string',
        default: 'id',
        description: 'The name of the property to match on in Input 1',
        displayOptions: {
          show: {
            mode: ['mergeByKey'],
          },
        },
      },
      {
        name: 'propertyName2',
        displayName: 'Property Name (Input 2)',
        type: 'string',
        default: 'id',
        description: 'The name of the property to match on in Input 2',
        displayOptions: {
          show: {
            mode: ['mergeByKey'],
          },
        },
      },
      {
        name: 'outputDataFrom',
        displayName: 'Output Data From',
        type: 'options',
        options: [
          { name: 'Both Inputs Merged', value: 'both' },
          { name: 'Input 1', value: 'input1' },
          { name: 'Input 2', value: 'input2' },
          { name: 'Input 1 Enriched', value: 'enrichInput1' },
          { name: 'Input 2 Enriched', value: 'enrichInput2' },
        ],
        default: 'both',
        description: 'Which input data to include in the output',
        displayOptions: {
          show: {
            mode: ['mergeByKey', 'mergeByIndex'],
          },
        },
      },
      {
        name: 'includeUnmatched',
        displayName: 'Include Unmatched Items',
        type: 'boolean',
        default: false,
        description: 'Whether to include items that do not match',
        displayOptions: {
          show: {
            mode: ['mergeByKey'],
          },
        },
      },

      // Merge by index settings
      {
        name: 'join',
        displayName: 'Join',
        type: 'options',
        options: [
          { name: 'Inner Join', value: 'inner' },
          { name: 'Left Join', value: 'left' },
          { name: 'Right Join', value: 'right' },
          { name: 'Outer Join', value: 'outer' },
        ],
        default: 'inner',
        description: 'How to join items by index',
        displayOptions: {
          show: {
            mode: ['mergeByIndex'],
          },
        },
      },

      // Choose Branch settings
      {
        name: 'chooseBranch',
        displayName: 'Choose Branch',
        type: 'options',
        options: [
          { name: 'Input 1', value: 0 },
          { name: 'Input 2', value: 1 },
        ],
        default: 0,
        displayOptions: {
          show: {
            mode: ['chooseBranch'],
          },
        },
        description: 'Which input branch to use',
      },

      // Combine settings
      {
        name: 'combineMode',
        displayName: 'Combine Mode',
        type: 'options',
        options: [
          { name: 'Merge By Position', value: 'mergeByPosition' },
          { name: 'Merge All to Single', value: 'mergeAllToSingle' },
          { name: 'Add Array', value: 'addArray' },
        ],
        default: 'mergeByPosition',
        description: 'How to combine the items',
        displayOptions: {
          show: {
            mode: ['combine'],
          },
        },
      },
      {
        name: 'arrayPropertyName',
        displayName: 'Array Property Name',
        type: 'string',
        default: 'data',
        description: 'Name of the property to add arrays under',
        displayOptions: {
          show: {
            mode: ['combine'],
            combineMode: ['addArray'],
          },
        },
      },

      // Append settings
      {
        name: 'removeDuplicates',
        displayName: 'Remove Duplicates',
        type: 'boolean',
        default: false,
        description: 'Remove duplicate items based on a property',
        displayOptions: {
          show: {
            mode: ['append'],
          },
        },
      },
      {
        name: 'duplicatePropertyName',
        displayName: 'Property for Duplicate Check',
        type: 'string',
        default: 'id',
        description: 'Property to check for duplicates',
        displayOptions: {
          show: {
            mode: ['append'],
            removeDuplicates: [true],
          },
        },
      },
      {
        name: 'addSource',
        displayName: 'Add Source Field',
        type: 'boolean',
        default: false,
        description: 'Add a field indicating which input the item came from',
        displayOptions: {
          show: {
            mode: ['append'],
          },
        },
      },
      {
        name: 'sourceFieldName',
        displayName: 'Source Field Name',
        type: 'string',
        default: '_source',
        description: 'Name of the source field',
        displayOptions: {
          show: {
            mode: ['append'],
            addSource: [true],
          },
        },
      },

      // Wait settings
      {
        name: 'waitForAll',
        displayName: 'Wait For All Inputs',
        type: 'boolean',
        default: true,
        description: 'Wait for data from all inputs before proceeding',
        displayOptions: {
          show: {
            mode: ['wait'],
          },
        },
      },
      {
        name: 'timeout',
        displayName: 'Timeout (ms)',
        type: 'number',
        default: 0,
        description: 'Maximum time to wait for inputs (0 = no timeout)',
        displayOptions: {
          show: {
            mode: ['wait'],
          },
        },
      },

      // Options
      {
        name: 'clashHandling',
        displayName: 'Property Name Clash Handling',
        type: 'options',
        options: [
          { name: 'Prefer Input 1', value: 'preferInput1' },
          { name: 'Prefer Input 2', value: 'preferInput2' },
          { name: 'Rename with Suffix', value: 'renameSuffix' },
          { name: 'Merge Nested', value: 'mergeNested' },
        ],
        default: 'preferInput1',
        description: 'How to handle properties with the same name',
      },
      {
        name: 'suffixInput1',
        displayName: 'Suffix for Input 1',
        type: 'string',
        default: '_1',
        description: 'Suffix to add to properties from Input 1',
        displayOptions: {
          show: {
            clashHandling: ['renameSuffix'],
          },
        },
      },
      {
        name: 'suffixInput2',
        displayName: 'Suffix for Input 2',
        type: 'string',
        default: '_2',
        description: 'Suffix to add to properties from Input 2',
        displayOptions: {
          show: {
            clashHandling: ['renameSuffix'],
          },
        },
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const mode = this.getNodeParameter('mode', 0) as string;
    
    // Get all input data (simplified for demo - in real multi-input system, this would get data from multiple inputs)
    const allInputs = this.getInputData();
    
    // For demo purposes, simulate having data from two inputs
    const input1Data = allInputs;
    const input2Data: any[] = []; // In real implementation, this would come from second input
    
    switch (mode) {
      case 'append':
        return executeAppend.call(this, input1Data, input2Data);
      case 'mergeByIndex':
        return executeMergeByIndex.call(this, input1Data, input2Data);
      case 'mergeByKey':
        return executeMergeByKey.call(this, input1Data, input2Data);
      case 'multiplex':
        return executeMultiplex.call(this, input1Data, input2Data);
      case 'combine':
        return executeCombine.call(this, input1Data, input2Data);
      case 'wait':
        return executeWait.call(this, input1Data, input2Data);
      case 'chooseBranch':
        return executeChooseBranch.call(this, input1Data, input2Data);
      default:
        throw new Error(`Unknown merge mode: ${mode}`);
    }
  }
}

async function executeAppend(this: INodeExecuteFunctions, input1: any[], input2: any[]): Promise<any[]> {
  const removeDuplicates = this.getNodeParameter('removeDuplicates', 0, false) as boolean;
  const duplicatePropertyName = this.getNodeParameter('duplicatePropertyName', 0, 'id') as string;
  const addSource = this.getNodeParameter('addSource', 0, false) as boolean;
  const sourceFieldName = this.getNodeParameter('sourceFieldName', 0, '_source') as string;
  
  let result = [...input1, ...input2];
  
  // Add source field if requested
  if (addSource) {
    result = result.map((item, index) => ({
      ...item,
      json: {
        ...item.json,
        [sourceFieldName]: index < input1.length ? 'input1' : 'input2',
      },
    }));
  }
  
  // Remove duplicates if requested
  if (removeDuplicates && duplicatePropertyName) {
    const seen = new Set();
    result = result.filter(item => {
      const value = getNestedValue(item.json, duplicatePropertyName);
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  return result;
}

async function executeMergeByIndex(this: INodeExecuteFunctions, input1: any[], input2: any[]): Promise<any[]> {
  const join = this.getNodeParameter('join', 0, 'inner') as string;
  const clashHandling = this.getNodeParameter('clashHandling', 0, 'preferInput1') as string;
  
  const result = [];
  const maxLength = Math.max(input1.length, input2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const item1 = input1[i];
    const item2 = input2[i];
    
    let mergedItem = null;
    
    switch (join) {
      case 'inner':
        if (item1 && item2) {
          mergedItem = mergeItems(item1, item2, clashHandling);
        }
        break;
      case 'left':
        if (item1) {
          mergedItem = item2 ? mergeItems(item1, item2, clashHandling) : item1;
        }
        break;
      case 'right':
        if (item2) {
          mergedItem = item1 ? mergeItems(item1, item2, clashHandling) : item2;
        }
        break;
      case 'outer':
        if (item1 || item2) {
          if (item1 && item2) {
            mergedItem = mergeItems(item1, item2, clashHandling);
          } else {
            mergedItem = item1 || item2;
          }
        }
        break;
    }
    
    if (mergedItem) {
      result.push(mergedItem);
    }
  }
  
  return result;
}

async function executeMergeByKey(this: INodeExecuteFunctions, input1: any[], input2: any[]): Promise<any[]> {
  const propertyName1 = this.getNodeParameter('propertyName1', 0, 'id') as string;
  const propertyName2 = this.getNodeParameter('propertyName2', 0, 'id') as string;
  const outputDataFrom = this.getNodeParameter('outputDataFrom', 0, 'both') as string;
  const includeUnmatched = this.getNodeParameter('includeUnmatched', 0, false) as boolean;
  const clashHandling = this.getNodeParameter('clashHandling', 0, 'preferInput1') as string;
  
  const result = [];
  const matched2 = new Set();
  
  for (const item1 of input1) {
    const key1 = getNestedValue(item1.json, propertyName1);
    
    const matches = input2.filter(item2 => {
      const key2 = getNestedValue(item2.json, propertyName2);
      return key1 === key2;
    });
    
    if (matches.length > 0) {
      for (const match of matches) {
        matched2.add(match);
        
        let outputItem;
        switch (outputDataFrom) {
          case 'both':
            outputItem = mergeItems(item1, match, clashHandling);
            break;
          case 'input1':
            outputItem = item1;
            break;
          case 'input2':
            outputItem = match;
            break;
          case 'enrichInput1':
            outputItem = {
              ...item1,
              json: {
                ...item1.json,
                _matched: match.json,
              },
            };
            break;
          case 'enrichInput2':
            outputItem = {
              ...match,
              json: {
                ...match.json,
                _matched: item1.json,
              },
            };
            break;
          default:
            outputItem = mergeItems(item1, match, clashHandling);
        }
        
        result.push(outputItem);
      }
    } else if (includeUnmatched) {
      result.push({
        ...item1,
        json: {
          ...item1.json,
          _matched: false,
        },
      });
    }
  }
  
  // Add unmatched items from input2 if requested
  if (includeUnmatched) {
    for (const item2 of input2) {
      if (!matched2.has(item2)) {
        result.push({
          ...item2,
          json: {
            ...item2.json,
            _matched: false,
          },
        });
      }
    }
  }
  
  return result;
}

async function executeMultiplex(this: INodeExecuteFunctions, input1: any[], input2: any[]): Promise<any[]> {
  const clashHandling = this.getNodeParameter('clashHandling', 0, 'preferInput1') as string;
  const result = [];
  
  for (const item1 of input1) {
    for (const item2 of input2) {
      const mergedItem = mergeItems(item1, item2, clashHandling);
      result.push(mergedItem);
    }
  }
  
  return result;
}

async function executeCombine(this: INodeExecuteFunctions, input1: any[], input2: any[]): Promise<any[]> {
  const combineMode = this.getNodeParameter('combineMode', 0, 'mergeByPosition') as string;
  const clashHandling = this.getNodeParameter('clashHandling', 0, 'preferInput1') as string;
  
  switch (combineMode) {
    case 'mergeByPosition':
      const result = [];
      const maxLength = Math.max(input1.length, input2.length);
      
      for (let i = 0; i < maxLength; i++) {
        const item1 = input1[i] || { json: {} };
        const item2 = input2[i] || { json: {} };
        result.push(mergeItems(item1, item2, clashHandling));
      }
      
      return result;
      
    case 'mergeAllToSingle':
      const allData1 = input1.map(item => item.json);
      const allData2 = input2.map(item => item.json);
      
      return [{
        json: {
          input1: allData1,
          input2: allData2,
          totalItems: allData1.length + allData2.length,
        },
      }];
      
    case 'addArray':
      const arrayPropertyName = this.getNodeParameter('arrayPropertyName', 0, 'data') as string;
      
      return input1.map((item, index) => ({
        ...item,
        json: {
          ...item.json,
          [arrayPropertyName]: input2[index] ? [item.json, input2[index].json] : [item.json],
        },
      }));
      
    default:
      return [...input1, ...input2];
  }
}

async function executeWait(this: INodeExecuteFunctions, input1: any[], input2: any[]): Promise<any[]> {
  const waitForAll = this.getNodeParameter('waitForAll', 0, true) as boolean;
  
  // In a real implementation, this would wait for all inputs
  // For now, just return combined data if we have both
  if (waitForAll) {
    if (input1.length > 0 && input2.length > 0) {
      return [...input1, ...input2];
    }
    return [];
  } else {
    // Return data from whichever input has data
    return input1.length > 0 ? input1 : input2;
  }
}

async function executeChooseBranch(this: INodeExecuteFunctions, input1: any[], input2: any[]): Promise<any[]> {
  const chooseBranch = this.getNodeParameter('chooseBranch', 0, 0) as number;
  
  return chooseBranch === 0 ? input1 : input2;
}

function mergeItems(item1: any, item2: any, clashHandling: string): any {
  let mergedJson;
  
  switch (clashHandling) {
    case 'preferInput1':
      mergedJson = { ...item2.json, ...item1.json };
      break;
    
    case 'preferInput2':
      mergedJson = { ...item1.json, ...item2.json };
      break;
    
    case 'renameSuffix':
      // This would need access to suffix parameters, simplified for now
      mergedJson = {};
      
      // Add items from input1 with suffix if there's a conflict
      for (const [key, value] of Object.entries(item1.json)) {
        const newKey = item2.json.hasOwnProperty(key) ? `${key}_1` : key;
        mergedJson[newKey] = value;
      }
      
      // Add items from input2 with suffix if there's a conflict
      for (const [key, value] of Object.entries(item2.json)) {
        const newKey = item1.json.hasOwnProperty(key) ? `${key}_2` : key;
        mergedJson[newKey] = value;
      }
      break;
    
    case 'mergeNested':
      mergedJson = deepMerge(item1.json, item2.json);
      break;
    
    default:
      mergedJson = { ...item2.json, ...item1.json };
  }
  
  return {
    json: mergedJson,
    pairedItem: [
      ...(item1.pairedItem ? [item1.pairedItem] : []),
      ...(item2.pairedItem ? [item2.pairedItem] : []),
    ],
  };
}

function deepMerge(obj1: any, obj2: any): any {
  const result = { ...obj1 };
  
  for (const [key, value] of Object.entries(obj2)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

function getNestedValue(obj: any, path: string): any {
  if (!path) return obj;
  return path.split('.').reduce((current, key) => {
    // Handle array notation like items[0]
    if (key.includes('[') && key.includes(']')) {
      const [arrayKey, indexStr] = key.split('[');
      const index = parseInt(indexStr.replace(']', ''));
      return current && current[arrayKey] && current[arrayKey][index];
    }
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
}