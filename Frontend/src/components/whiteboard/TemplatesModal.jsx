import React, { useState } from "react";
import { Grid3x3, X, Columns, Award, GitBranch, LayoutGrid } from "lucide-react";
import toast from "react-hot-toast";

export const TemplatesModal = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState("swot");
  const [appendMode, setAppendMode] = useState("append"); // 'append' or 'replace'

  const templatesList = [
    {
      id: "swot",
      title: "SWOT Analysis",
      description: "Map out Strengths, Weaknesses, Opportunities, and Threats to analyze strategic initiatives.",
      icon: LayoutGrid,
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    {
      id: "kanban",
      title: "Kanban Board",
      description: "Manage tasks across To-Do, In-Progress, and Done columns for workflow efficiency.",
      icon: Columns,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    {
      id: "mindmap",
      title: "Brainstorming Mind Map",
      description: "Explore ideas visually with a central concept radiating out into subtopics.",
      icon: GitBranch,
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
    {
      id: "retro",
      title: "Agile Retrospective",
      description: "Gather feedback on What Went Well, What to Improve, and Action Items.",
      icon: Award,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onApplyTemplate(selectedTemplate, appendMode === "append");
    toast.success(`${templatesList.find(t => t.id === selectedTemplate)?.title} applied!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
      <div className="bg-surface border border-outline-variant rounded-3xl p-6 shadow-2xl max-w-lg w-full mx-4 flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-on-surface">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Grid3x3 className="animate-in spin-in-12 duration-500" size={20} />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-on-surface text-base font-extrabold leading-tight">
                Templates Gallery
              </h3>
              <p className="text-[11px] text-on-surface-variant/80 font-medium tracking-wide">
                Start drawing instantly with interactive frameworks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-outline hover:text-error hover:bg-error-container/20 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Templates Selection Grid */}
        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
          {templatesList.map((tmpl) => {
            const TmplIcon = tmpl.icon;
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tmpl.id)}
                className={`flex flex-col gap-2 p-3 text-left rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary-container/10 shadow-md ring-2 ring-primary/10"
                    : "border-outline-variant hover:border-outline hover:bg-surface-container-high"
                }`}
              >
                <div className={`p-2 rounded-xl border w-fit ${tmpl.color}`}>
                  <TmplIcon size={18} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-on-surface">{tmpl.title}</span>
                  <span className="text-[10px] text-on-surface-variant/80 leading-normal font-medium">{tmpl.description}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2 text-left border-t border-outline-variant/60 pt-4">
          <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
            Insertion Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAppendMode("append")}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                appendMode === "append"
                  ? "bg-primary border-primary text-on-primary shadow-sm"
                  : "bg-surface border-outline-variant hover:bg-surface-container-high text-on-surface-variant"
              }`}
            >
              Add to current board
            </button>
            <button
              type="button"
              onClick={() => setAppendMode("replace")}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                appendMode === "replace"
                  ? "bg-error border-error text-on-error shadow-sm animate-none"
                  : "bg-surface border-outline-variant hover:bg-surface-container-high text-on-surface-variant"
              }`}
            >
              Clear & replace board
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 justify-end border-t border-outline-variant/60 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors text-xs font-bold text-on-surface-variant cursor-pointer active:scale-95"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2.5 bg-primary hover:bg-primary/95 rounded-xl transition-all text-xs font-bold text-on-primary cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md"
          >
            Apply Template
          </button>
        </div>

      </div>
    </div>
  );
};
