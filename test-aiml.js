try {
  const { AIMLNode } = require('./src/core/integrations/AIMLNode');
  console.log('AIMLNode loaded successfully:', !!AIMLNode);
  console.log('AIMLNode name:', new AIMLNode().description.name);
} catch (e) {
  console.error('Error loading AIMLNode:', e.message);
  console.error('Stack:', e.stack);
}