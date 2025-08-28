import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TemplateCanvas } from '../TemplateCanvas';

// Mock ReactFlow
jest.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow">
      {children}
    </div>
  ),
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
  MiniMap: () => <div data-testid="minimap" />,
  Panel: ({ children }: { children: React.ReactNode }) => <div data-testid="panel">{children}</div>,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  addEdge: jest.fn(),
  MarkerType: { ArrowClosed: 'arrowclosed' },
  BackgroundVariant: { Dots: 'dots' },
}));

// Mock WorkflowBuilder components
jest.mock('../../WorkflowBuilder/NodePalette', () => ({
  NodePalette: () => <div data-testid="node-palette">Node Palette</div>
}));

jest.mock('../../WorkflowBuilder/NodeConfigPanel', () => ({
  NodeConfigPanel: () => <div data-testid="node-config-panel">Node Config Panel</div>
}));

jest.mock('../../WorkflowBuilder/WorkflowToolbar', () => ({
  WorkflowToolbar: () => <div data-testid="workflow-toolbar">Workflow Toolbar</div>
}));

jest.mock('../../WorkflowBuilder/nodes/CustomNode', () => ({
  CustomNode: () => <div data-testid="custom-node">Custom Node</div>
}));

jest.mock('../../WorkflowBuilder/nodes/TriggerNode', () => ({
  TriggerNode: () => <div data-testid="trigger-node">Trigger Node</div>
}));

jest.mock('../../WorkflowBuilder/nodes/ActionNode', () => ({
  ActionNode: () => <div data-testid="action-node">Action Node</div>
}));

jest.mock('../../WorkflowBuilder/nodes/ConditionNode', () => ({
  ConditionNode: () => <div data-testid="condition-node">Condition Node</div>
}));

describe('TemplateCanvas', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the template canvas layout correctly', () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    expect(screen.getByText('Template Builder')).toBeInTheDocument();
    expect(screen.getByText('Create your custom workflow template')).toBeInTheDocument();
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('node-palette')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Template' })).toBeInTheDocument();
  });

  it('displays welcome message when no nodes are present', () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    expect(screen.getByText('Build Your Template')).toBeInTheDocument();
    expect(screen.getByText('Drag nodes from the sidebar to create your workflow template')).toBeInTheDocument();
  });

  it('renders TemplateInfo component with correct structure', () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    expect(screen.getByText('Template Information')).toBeInTheDocument();
    expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
  });

  it('handles template name input correctly', async () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    const nameInput = screen.getByLabelText('Template Name');
    fireEvent.change(nameInput, { target: { value: 'My Custom Template' } });

    expect(nameInput).toHaveValue('My Custom Template');
  });

  it('handles description input correctly', async () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    const descriptionInput = screen.getByLabelText('Description');
    fireEvent.change(descriptionInput, { target: { value: 'This is a test template' } });

    expect(descriptionInput).toHaveValue('This is a test template');
  });

  it('handles category selection correctly', async () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    const categorySelect = screen.getByLabelText('Category');
    fireEvent.change(categorySelect, { target: { value: 'data-processing' } });

    expect(categorySelect).toHaveValue('data-processing');
  });

  it('handles difficulty selection correctly', async () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    const difficultySelect = screen.getByLabelText('Difficulty');
    fireEvent.change(difficultySelect, { target: { value: 'advanced' } });

    expect(difficultySelect).toHaveValue('advanced');
  });

  it('validates required fields before saving', async () => {
    // Mock window.alert
    window.alert = jest.fn();

    render(<TemplateCanvas onSave={mockOnSave} />);

    const saveButton = screen.getByRole('button', { name: 'Save Template' });
    fireEvent.click(saveButton);

    expect(window.alert).toHaveBeenCalledWith('Please enter a template name');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates nodes presence before saving', async () => {
    window.alert = jest.fn();

    render(<TemplateCanvas onSave={mockOnSave} />);

    // Fill in template name
    const nameInput = screen.getByLabelText('Template Name');
    fireEvent.change(nameInput, { target: { value: 'Test Template' } });

    const saveButton = screen.getByRole('button', { name: 'Save Template' });
    fireEvent.click(saveButton);

    expect(window.alert).toHaveBeenCalledWith('Please add at least one node to your template');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('handles use cases input with comma separation', async () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    const useCasesInput = screen.getByLabelText('Use Cases');
    fireEvent.change(useCasesInput, { target: { value: 'automation, data-sync, integration' } });

    // The input should show the comma-separated values
    expect(useCasesInput).toHaveValue('automation, data-sync, integration');
  });

  it('handles tags input with comma separation', async () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    const tagsInput = screen.getByLabelText('Tags');
    fireEvent.change(tagsInput, { target: { value: 'api, webhook, email' } });

    // The input should show the comma-separated values
    expect(tagsInput).toHaveValue('api, webhook, email');
  });

  it('renders ReactFlow components correctly', () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
  });

  it('renders workflow toolbar in panel', () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    expect(screen.getByTestId('workflow-toolbar')).toBeInTheDocument();
  });

  it('has proper CSS classes for styling', () => {
    const { container } = render(<TemplateCanvas onSave={mockOnSave} />);

    expect(container.querySelector('.workflow-builder')).toBeInTheDocument();
    expect(container.querySelector('.sidebar')).toBeInTheDocument();
    expect(container.querySelector('.canvas-container')).toBeInTheDocument();
    expect(container.querySelector('.config-section')).toBeInTheDocument();
  });

  it('passes initial data to template info when provided', () => {
    const initialData = {
      name: 'Existing Template',
      description: 'Pre-filled template',
      category: 'integration',
      difficulty: 'intermediate',
      tags: ['test'],
      useCase: ['testing']
    };

    render(<TemplateCanvas onSave={mockOnSave} initialData={initialData} />);

    const nameInput = screen.getByLabelText('Template Name');
    expect(nameInput).toHaveValue('Existing Template');

    const descriptionInput = screen.getByLabelText('Description');
    expect(descriptionInput).toHaveValue('Pre-filled template');
  });

  it('has accessible form elements', () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    // Check for proper labels
    expect(screen.getByLabelText('Template Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Difficulty')).toBeInTheDocument();
    expect(screen.getByLabelText('Use Cases')).toBeInTheDocument();
    expect(screen.getByLabelText('Tags')).toBeInTheDocument();

    // Check for button
    expect(screen.getByRole('button', { name: 'Save Template' })).toBeInTheDocument();
  });

  it('displays help text for array inputs', () => {
    render(<TemplateCanvas onSave={mockOnSave} />);

    expect(screen.getByText('Separate multiple use cases with commas')).toBeInTheDocument();
    expect(screen.getByText('Separate multiple tags with commas')).toBeInTheDocument();
  });
});