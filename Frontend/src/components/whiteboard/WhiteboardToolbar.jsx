const DEFAULT_COLOR_PALETTE = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Green", hex: "#166534" },
  { name: "Orange", hex: "#b45309" },
  { name: "Red", hex: "#b91c1c" },
];

const WhiteboardToolbar = ({
  selectedTool,
  setSelectedTool,
  setSelectedElementId,
  currentColor,
  setCurrentColor,
  colorPalette = DEFAULT_COLOR_PALETTE,
  selectedElementId,
  selectedElementIds,
  handleDeleteSelected,
  handleClearCanvas,
  handleAlign,
  handleImageUpload,
  isReadOnly,
  onOpenTemplates,
}) => {
  return (
    <>
      {!isReadOnly ? (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col space-y-1.5 p-1.5 glass-panel rounded-2xl shadow-float z-40 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar transition-all duration-300">
          <button
            onClick={() => {
              setSelectedTool("pencil");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "pencil"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Pen Tool"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>

          <button
            onClick={() => {
              setSelectedTool("select");
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "select"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Select"
          >
            <span className="material-symbols-outlined text-[20px]">near_me</span>
          </button>

          <div className="h-[1px] w-6 mx-auto bg-outline-variant my-0.5"></div>

          <button
            onClick={() => {
              setSelectedTool("rectangle");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "rectangle"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Rectangle"
          >
            <span className="material-symbols-outlined text-[20px]">rectangle</span>
          </button>

          <button
            onClick={() => {
              setSelectedTool("circle");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "circle"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Circle"
          >
            <span className="material-symbols-outlined text-[20px]">circle</span>
          </button>

          <button
            onClick={() => {
              setSelectedTool("diamond");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "diamond"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Diamond"
          >
            <span className="material-symbols-outlined text-[20px]">diamond</span>
          </button>

          <button
            onClick={() => {
              setSelectedTool("triangle");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "triangle"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Triangle"
          >
            <span className="material-symbols-outlined text-[20px]">change_history</span>
          </button>

          <button
            onClick={() => {
              setSelectedTool("arrow");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "arrow"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Arrow"
          >
            <span className="material-symbols-outlined text-[20px]">east</span>
          </button>

          <button
            onClick={() => {
              setSelectedTool("line");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "line"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Line"
          >
            <span className="material-symbols-outlined text-[20px]">horizontal_rule</span>
          </button>

          <button
            onClick={() => {
              setSelectedTool("sticky");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "sticky"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Sticky Note"
          >
            <span className="material-symbols-outlined text-[20px]">sticky_note_2</span>
          </button>

          <div className="h-[1px] w-6 mx-auto bg-outline-variant my-0.5"></div>

          <button
            onClick={() => {
              setSelectedTool("text");
              setSelectedElementId(null);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              selectedTool === "text"
                ? "bg-primary text-on-primary shadow-soft"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Text Tool"
          >
            <span className="material-symbols-outlined text-[20px]">text_fields</span>
          </button>

          <input
            type="file"
            accept="image/*"
            id="image-upload"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageUpload(e.target.files[0]);
                e.target.value = null;
              }
            }}
          />
          <button
            onClick={() => document.getElementById("image-upload").click()}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            title="Upload Image"
          >
            <span className="material-symbols-outlined text-[20px]">image</span>
          </button>

          <button
            onClick={onOpenTemplates}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            title="Templates Gallery"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
          </button>

          <div className="h-[1px] w-6 mx-auto bg-outline-variant my-0.5"></div>

          {/* Compact 2-column Grid for Color Selection */}
          <div className="grid grid-cols-2 gap-1 p-0.5 justify-items-center">
            {colorPalette.map((color) => {
              const isSelected = currentColor === color.hex;
              return (
                <button
                  key={color.hex}
                  onClick={() => setCurrentColor(color.hex)}
                  className={`w-5 h-5 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? "border border-primary bg-surface shadow-soft scale-110"
                      : "border border-transparent hover:bg-surface-container hover:scale-105"
                  }`}
                  title={`${color.name} Color`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              );
            })}
          </div>

          <div className="h-[1px] w-6 mx-auto bg-outline-variant my-0.5"></div>

          <button
            onClick={handleDeleteSelected}
            disabled={
              !selectedElementId &&
              (!selectedElementIds || selectedElementIds.length === 0)
            }
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              selectedElementId ||
              (selectedElementIds && selectedElementIds.length > 0)
                ? "text-error hover:bg-error/10 cursor-pointer animate-pulse"
                : "text-on-surface-variant/30 cursor-not-allowed"
            }`}
            title="Delete Selected"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>

          <button
            onClick={handleClearCanvas}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-error/10 transition-colors cursor-pointer"
            title="Clear Canvas"
          >
            <span className="material-symbols-outlined text-[20px]">ink_eraser</span>
          </button>

          {selectedElementIds && selectedElementIds.length > 1 && (
            <>
              <div className="h-[1px] w-6 mx-auto bg-outline-variant my-0.5"></div>
              {/* Compact 2-column grid for Align Tools */}
              <div className="grid grid-cols-2 gap-1 p-0.5">
                <button
                  onClick={() => handleAlign("left")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  title="Align Left"
                >
                  <span className="material-symbols-outlined text-[16px]">align_horizontal_left</span>
                </button>
                <button
                  onClick={() => handleAlign("center")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  title="Align Center"
                >
                  <span className="material-symbols-outlined text-[16px]">align_horizontal_center</span>
                </button>
                <button
                  onClick={() => handleAlign("right")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  title="Align Right"
                >
                  <span className="material-symbols-outlined text-[16px]">align_horizontal_right</span>
                </button>
                <button
                  onClick={() => handleAlign("distribute")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  title="Distribute Evenly"
                >
                  <span className="material-symbols-outlined text-[16px]">align_horizontal_right</span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="absolute left-6 top-6 glass-panel rounded-xl px-3 py-1.5 shadow-float flex items-center gap-2 z-30 animate-in slide-in-from-left duration-300 text-xs font-bold text-on-surface-variant bg-surface-container-high/90">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <span>Viewer (Read-Only)</span>
        </div>
      )}
    </>
  );
};

export default WhiteboardToolbar;
