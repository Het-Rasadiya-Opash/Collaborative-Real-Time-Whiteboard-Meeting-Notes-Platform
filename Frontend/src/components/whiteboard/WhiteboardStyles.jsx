import React from "react";

export const WhiteboardStyles = () => {
  return (
    <style>{`
      .whiteboard-root {
        --color-primary: #2563eb;
        --color-on-primary: #ffffff;
        --color-primary-container: #2563eb;
        --color-background: #f8fafc;
        --color-on-background: #1e293b;
        --color-surface: #ffffff;
        --color-surface-bright: #ffffff;
        --color-surface-dim: #e2e8f0;
        --color-surface-container-lowest: #ffffff;
        --color-surface-container-low: #f8fafc;
        --color-surface-container: #f1f5f9;
        --color-surface-container-high: #e2e8f0;
        --color-surface-container-highest: #cbd5e1;
        --color-surface-glass: rgba(255, 255, 255, 0.85);
        --color-outline: #94a3b8;
        --color-outline-variant: #e2e8f0;
        --color-on-surface: #1e293b;
        --color-on-surface-variant: #475569;
        --color-secondary: #7c3aed;
        --color-secondary-container: #f1f5f9;
        --color-on-secondary-container: #1e293b;
        --color-success-emerald: #166534;
        --color-active-indicator: #2563eb;
        --color-primary-fixed: #dbeafe;
        --color-on-primary-fixed: #1e3a8a;
      }
      .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      }
      .glass-card {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      .canvas-dot-grid {
        background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
        background-size: 32px 32px;
      }
      .cursor-smooth {
        transition: all 0.15s cubic-bezier(0.23, 1, 0.32, 1);
      }
      .sidebar-transition {
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .rich-text-editor:empty:before {
        content: attr(placeholder);
        color: #94a3b8;
        opacity: 0.65;
        pointer-events: none;
      }
      .rich-text-editor ul {
        list-style-type: disc !important;
        padding-left: 1.25rem !important;
        margin-top: 0.25rem !important;
        margin-bottom: 0.25rem !important;
      }
      .rich-text-editor ol {
        list-style-type: decimal !important;
        padding-left: 1.25rem !important;
        margin-top: 0.25rem !important;
        margin-bottom: 0.25rem !important;
      }
      .rich-text-editor p {
        margin-bottom: 0.25rem !important;
      }
    `}</style>
  );
};
