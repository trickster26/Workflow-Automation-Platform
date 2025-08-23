import React, { useRef } from 'react';
import {
  FaSave,
  FaPlay,
  FaDownload,
  FaUpload,
  FaUndo,
  FaRedo,
  FaCopy,
  FaTrash,
  FaExpand,
  FaCompress,
  FaEye,
  FaEdit,
} from 'react-icons/fa';
import './WorkflowToolbar.css';

interface WorkflowToolbarProps {
  onSave?: () => void;
  onTest?: () => void;
  onExport?: () => void;
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onClear?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  isReadOnly?: boolean;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  onSave,
  onTest,
  onExport,
  onImport,
  onUndo,
  onRedo,
  onDuplicate,
  onClear,
  onToggleFullscreen,
  isFullscreen = false,
  isReadOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="workflow-toolbar">
      <div className="toolbar-section">
        <div className="toolbar-title">
          {isReadOnly ? (
            <>
              <FaEye /> View Mode
            </>
          ) : (
            <>
              <FaEdit /> Edit Mode
            </>
          )}
        </div>
      </div>

      <div className="toolbar-section">
        {!isReadOnly && (
          <>
            <button
              className="toolbar-btn btn-primary"
              onClick={onSave}
              title="Save Workflow"
            >
              <FaSave /> Save
            </button>
            <button
              className="toolbar-btn btn-success"
              onClick={onTest}
              title="Test Workflow"
            >
              <FaPlay /> Test
            </button>
          </>
        )}
      </div>

      <div className="toolbar-section">
        {!isReadOnly && (
          <>
            <button
              className="toolbar-btn"
              onClick={onUndo}
              title="Undo"
              disabled={!onUndo}
            >
              <FaUndo />
            </button>
            <button
              className="toolbar-btn"
              onClick={onRedo}
              title="Redo"
              disabled={!onRedo}
            >
              <FaRedo />
            </button>
            <div className="toolbar-separator" />
          </>
        )}
        
        <button
          className="toolbar-btn"
          onClick={onExport}
          title="Export Workflow"
        >
          <FaDownload />
        </button>
        
        {!isReadOnly && (
          <>
            <button
              className="toolbar-btn"
              onClick={handleImportClick}
              title="Import Workflow"
            >
              <FaUpload />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={onImport}
              style={{ display: 'none' }}
            />
          </>
        )}
        
        {!isReadOnly && (
          <>
            <div className="toolbar-separator" />
            <button
              className="toolbar-btn"
              onClick={onDuplicate}
              title="Duplicate Workflow"
              disabled={!onDuplicate}
            >
              <FaCopy />
            </button>
            <button
              className="toolbar-btn btn-danger"
              onClick={onClear}
              title="Clear Canvas"
              disabled={!onClear}
            >
              <FaTrash />
            </button>
          </>
        )}
      </div>

      <div className="toolbar-section">
        <button
          className="toolbar-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>
    </div>
  );
};