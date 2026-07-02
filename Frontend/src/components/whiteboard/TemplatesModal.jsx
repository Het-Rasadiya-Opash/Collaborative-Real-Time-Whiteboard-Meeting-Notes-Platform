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
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      id: "kanban",
      title: "Kanban Board",
      description: "Manage tasks across To-Do, In-Progress, and Done columns for workflow efficiency.",
      icon: Columns,
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      id: "mindmap",
      title: "Brainstorming Mind Map",
      description: "Explore ideas visually with a central concept radiating out into subtopics.",
      icon: GitBranch,
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      id: "retro",
      title: "Agile Retrospective",
      description: "Gather feedback on What Went Well, What to Improve, and Action Items.",
      icon: Award,
      color: "bg-amber-50 text-amber-600 border-amber-100",
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
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-lg w-full mx-4 flex flex-col gap-5 animate-in zoom-in-95 duration-200 text-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Grid3x3 className="animate-in spin-in-12 duration-500" size={20} />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="text-slate-850 text-base font-extrabold leading-tight">
                Templates Gallery
              </h3>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                Start drawing instantly with interactive frameworks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
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
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/10"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className={`p-2 rounded-xl border w-fit ${tmpl.color}`}>
                  <TmplIcon size={18} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-800">{tmpl.title}</span>
                  <span className="text-[10px] text-slate-500 leading-normal font-medium">{tmpl.description}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2 text-left border-t border-slate-100 pt-4">
          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Insertion Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAppendMode("append")}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                appendMode === "append"
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              Add to current board
            </button>
            <button
              type="button"
              onClick={() => setAppendMode("replace")}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                appendMode === "replace"
                  ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              Clear & replace board
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-600 cursor-pointer active:scale-95"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2.5 bg-primary hover:bg-primary/95 rounded-xl transition-all text-xs font-bold text-white cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md shadow-primary/10"
          >
            Apply Template
          </button>
        </div>

      </div>
    </div>
  );
};
