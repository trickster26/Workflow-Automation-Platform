import React from 'react';

interface TemplateInfoProps {
  templateInfo: {
    name: string;
    description: string;
    category: string;
    difficulty: string;
    tags: string[];
    useCase: string[];
  };
  onChange: (info: any) => void;
}

export const TemplateInfo: React.FC<TemplateInfoProps> = ({ templateInfo, onChange }) => {
  const categories = [
    'trigger',
    'transform',
    'integration',
    'data-processing',
    'alerting',
    'communication',
    'database',
    'files',
    'ai',
    'analytics'
  ];

  const handleChange = (field: string, value: any) => {
    onChange({ ...templateInfo, [field]: value });
  };

  const handleArrayChange = (field: 'tags' | 'useCase', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    handleChange(field, items);
  };

  return (
    <div className="config-section">
      <div className="config-header">
        <h3>Template Information</h3>
      </div>
      
      <div className="config-content">
        <div className="config-field">
          <label>Template Name</label>
          <input
            type="text"
            value={templateInfo.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Custom Template"
            required
          />
        </div>

        <div className="config-field">
          <label>Description</label>
          <textarea
            rows={3}
            value={templateInfo.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What does this template do?"
          />
        </div>

        <div className="config-row">
          <div className="config-field">
            <label>Category</label>
            <select
              value={templateInfo.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="config-field">
            <label>Difficulty</label>
            <select
              value={templateInfo.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="config-field">
          <label>Use Cases</label>
          <input
            type="text"
            value={templateInfo.useCase.join(', ')}
            onChange={(e) => handleArrayChange('useCase', e.target.value)}
            placeholder="automation, data-sync, integration"
          />
          <div className="field-hint">Separate multiple use cases with commas</div>
        </div>

        <div className="config-field">
          <label>Tags</label>
          <input
            type="text"
            value={templateInfo.tags.join(', ')}
            onChange={(e) => handleArrayChange('tags', e.target.value)}
            placeholder="api, webhook, email"
          />
          <div className="field-hint">Separate multiple tags with commas</div>
        </div>
      </div>
    </div>
  );
};