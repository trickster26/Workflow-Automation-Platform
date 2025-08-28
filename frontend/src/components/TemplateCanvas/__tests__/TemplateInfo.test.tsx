import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TemplateInfo } from '../TemplateInfo';

describe('TemplateInfo', () => {
  const defaultTemplateInfo = {
    name: '',
    description: '',
    category: 'integration',
    difficulty: 'beginner',
    tags: [],
    useCase: []
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields correctly', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Template Information')).toBeInTheDocument();
    expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
    expect(screen.getByLabelText('Use Cases')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();
  });

  it('displays current template info values', () => {
    const templateInfo = {
      name: 'Test Template',
      description: 'A test template for unit testing',
      category: 'data-processing',
      difficulty: 'intermediate',
      tags: ['test', 'unit'],
      useCase: ['testing', 'validation']
    };

    render(
      <TemplateInfo
        templateInfo={templateInfo}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test template for unit testing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('data-processing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('intermediate')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testing, validation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test, unit')).toBeInTheDocument();
  });

  it('calls onChange when name is updated', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const nameInput = screen.getByLabelText('Template Name');
    fireEvent.change(nameInput, { target: { value: 'New Template Name' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      name: 'New Template Name'
    });
  });

  it('calls onChange when description is updated', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'New description' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      description: 'New description'
    });
  });

  it('calls onChange when category is updated', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: 'alerting' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      category: 'alerting'
    });
  });

  it('calls onChange when difficulty is updated', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const difficultySelect = screen.getByLabelText('Difficulty');
    fireEvent.change(difficultySelect, { target: { value: 'advanced' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      difficulty: 'advanced'
    });
  });

  it('handles use cases input with proper array conversion', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const useCasesInput = screen.getByLabelText('Use Cases');
    fireEvent.change(useCasesInput, { target: { value: 'automation, data-sync, integration' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      useCase: ['automation', 'data-sync', 'integration']
    });
  });

  it('handles tags input with proper array conversion', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const tagsInput = screen.getByLabelText('Tags');
    fireEvent.change(tagsInput, { target: { value: 'api, webhook, email' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      tags: ['api', 'webhook', 'email']
    });
  });

  it('trims whitespace and filters empty strings in array inputs', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const tagsInput = screen.getByLabelText('Tags');
    fireEvent.change(tagsInput, { target: { value: ' api , , webhook , email , ' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      tags: ['api', 'webhook', 'email']
    });
  });

  it('handles empty array inputs correctly', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const useCasesInput = screen.getByLabelText('Use Cases');
    fireEvent.change(useCasesInput, { target: { value: '   ,  ,   ' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultTemplateInfo,
      useCase: []
    });
  });

  it('displays all category options', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const categorySelect = screen.getByLabelText('Category');
    const options = Array.from(categorySelect.children) as HTMLOptionElement[];
    const optionValues = options.map(option => option.value);

    expect(optionValues).toContain('trigger');
    expect(optionValues).toContain('transform');
    expect(optionValues).toContain('integration');
    expect(optionValues).toContain('data-processing');
    expect(optionValues).toContain('alerting');
    expect(optionValues).toContain('communication');
    expect(optionValues).toContain('database');
    expect(optionValues).toContain('files');
    expect(optionValues).toContain('ai');
    expect(optionValues).toContain('analytics');
  });

  it('displays all difficulty options', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const difficultySelect = screen.getByLabelText('Difficulty');
    const options = Array.from(difficultySelect.children) as HTMLOptionElement[];
    const optionValues = options.map(option => option.value);

    expect(optionValues).toContain('beginner');
    expect(optionValues).toContain('intermediate');
    expect(optionValues).toContain('advanced');
  });

  it('shows proper capitalized labels for category options', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const categorySelect = screen.getByLabelText('Category');
    const options = Array.from(categorySelect.children) as HTMLOptionElement[];

    // Check that data-processing becomes "Data processing"
    const dataProcessingOption = options.find(option => option.value === 'data-processing');
    expect(dataProcessingOption?.textContent).toBe('Data processing');

    // Check that ai becomes "Ai"
    const aiOption = options.find(option => option.value === 'ai');
    expect(aiOption?.textContent).toBe('Ai');
  });

  it('has proper placeholders for inputs', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByPlaceholderText('My Custom Template')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('What does this template do?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('automation, data-sync, integration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('api, webhook, email')).toBeInTheDocument();
  });

  it('shows field hints for array inputs', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Separate multiple use cases with commas')).toBeInTheDocument();
    expect(screen.getByText('Separate multiple tags with commas')).toBeInTheDocument();
  });

  it('has required attribute on name input', () => {
    render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    const nameInput = screen.getByLabelText('Template Name');
    expect(nameInput).toHaveAttribute('required');
  });

  it('has proper CSS classes for styling', () => {
    const { container } = render(
      <TemplateInfo
        templateInfo={defaultTemplateInfo}
        onChange={mockOnChange}
      />
    );

    expect(container.querySelector('.config-section')).toBeInTheDocument();
    expect(container.querySelector('.config-header')).toBeInTheDocument();
    expect(container.querySelector('.config-content')).toBeInTheDocument();
    expect(container.querySelector('.config-field')).toBeInTheDocument();
    expect(container.querySelector('.config-row')).toBeInTheDocument();
    expect(container.querySelector('.field-hint')).toBeInTheDocument();
  });

  it('maintains object reference stability for unchanged properties', () => {
    const templateInfo = {
      name: 'Test',
      description: 'Description',
      category: 'integration',
      difficulty: 'beginner',
      tags: ['tag1'],
      useCase: ['use1']
    };

    render(
      <TemplateInfo
        templateInfo={templateInfo}
        onChange={mockOnChange}
      />
    );

    const nameInput = screen.getByLabelText('Template Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const calledWith = mockOnChange.mock.calls[0][0];
    
    // Should preserve other properties by reference
    expect(calledWith.tags).toBe(templateInfo.tags);
    expect(calledWith.useCase).toBe(templateInfo.useCase);
    expect(calledWith.name).toBe('New Name');
  });
});