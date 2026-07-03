
export const WhiteboardStyles = () => {
  return (
    <style>{`
      .whiteboard-root {
        --color-primary: var(--primary);
        --color-on-primary: var(--on-primary);
        --color-primary-container: var(--primary-container);
        --color-background: var(--background);
        --color-on-background: var(--on-background);
        --color-surface: var(--surface);
        --color-surface-bright: var(--surface-bright);
        --color-surface-dim: var(--surface-dim);
        --color-surface-container-lowest: var(--surface-container-lowest);
        --color-surface-container-low: var(--surface-container-low);
        --color-surface-container: var(--surface-container);
        --color-surface-container-high: var(--surface-container-high);
        --color-surface-container-highest: var(--surface-container-highest);
        --color-surface-glass: var(--glass-panel-bg);
        --color-outline: var(--outline);
        --color-outline-variant: var(--outline-variant);
        --color-on-surface: var(--on-surface);
        --color-on-surface-variant: var(--on-surface-variant);
        --color-secondary: var(--secondary);
        --color-secondary-container: var(--secondary-container);
        --color-on-secondary-container: var(--on-secondary-container);
        --color-success-emerald: var(--success-text);
        --color-active-indicator: var(--primary);
        --color-primary-fixed: var(--primary-fixed-dim);
        --color-on-primary-fixed: var(--on-primary);
      }
      .material-symbols-outlined {
        font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      }
      .glass-card {
        background: var(--glass-bg);
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
