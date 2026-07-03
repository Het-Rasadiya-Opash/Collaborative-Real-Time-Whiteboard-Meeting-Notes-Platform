
export const WhiteboardStyles = () => {
  return (
    <style>{`
      .whiteboard-root {
        --color-primary: #004ac6;
        --color-on-primary: #ffffff;
        --color-primary-container: #2563eb;
        --color-background: #faf8ff;
        --color-on-background: #131b2e;
        --color-surface: #faf8ff;
        --color-surface-bright: #faf8ff;
        --color-surface-dim: #d2d9f4;
        --color-surface-container-lowest: #ffffff;
        --color-surface-container-low: #f2f3ff;
        --color-surface-container: #eaedff;
        --color-surface-container-high: #e2e7ff;
        --color-surface-container-highest: #dae2fd;
        --color-surface-glass: rgba(255, 255, 255, 0.85);
        --color-outline: #737686;
        --color-outline-variant: #c3c6d7;
        --color-on-surface: #131b2e;
        --color-on-surface-variant: #434655;
        --color-secondary: #5a5f68;
        --color-secondary-container: #dee2ed;
        --color-on-secondary-container: #60656e;
        --color-success-emerald: #007d55;
        --color-active-indicator: #004ac6;
        --color-primary-fixed: #b4c5ff;
        --color-on-primary-fixed: #004ac6;
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
        background-image: radial-gradient(var(--color-outline-variant) 1.5px, transparent 1.5px);
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
