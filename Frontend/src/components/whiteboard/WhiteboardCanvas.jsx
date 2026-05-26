import React from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle as KonvaCircle,
  Line,
  Group,
  Text,
  Transformer,
} from "react-konva";
import { ZoomIn, ZoomOut, Undo2, Redo2 } from "lucide-react";

const getStickyTextColor = (bgColor) => {
  if (!bgColor) return "#1e293b";
  const hex = bgColor.toLowerCase();
  if (
    hex === "#ffffff" ||
    hex === "#fef08a" ||
    hex === "#eff4ff" ||
    hex === "#fdf08a"
  ) {
    return "#1e293b";
  }
  return "#ffffff";
};

const WhiteboardCanvas = ({
  canvasRef,
  transformerRef,
  dimensions,
  zoom,
  setZoom,
  isReadOnly,
  selectedTool,
  selectedElementId,
  displayedElements,
  currentDrawingElement,
  editingStickyId,
  editingStickyText,
  setEditingStickyText,
  handleStageMouseDown,
  handleStageMouseMove,
  handleStageMouseUp,
  handleShapeSelect,
  handleDragMove,
  handleTransformEnd,
  handleDoubleClickSticky,
  finishStickyEditing,
  handleUndo,
  handleRedo,
  historyCount,
  redoCount,
}) => {
  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative overflow-hidden"
      style={{ pointerEvents: "all" }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <Layer>
          <Rect
            id="stage-background"
            x={0}
            y={0}
            width={dimensions.width * 4}
            height={dimensions.height * 4}
            fill="transparent"
          />
        </Layer>
        <Layer scaleX={zoom / 100} scaleY={zoom / 100}>
          {displayedElements.map((el) => {
            const isSelected = el.id === selectedElementId;

            if (el.type === "stroke") {
              return (
                <Line
                  key={el.id}
                  id={el.id}
                  points={el.points.flatMap((p) => [p.x, p.y])}
                  stroke={el.color}
                  strokeWidth={el.strokeWidth || 4}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.8}
                  draggable={selectedTool === "select" && !isReadOnly}
                  onClick={(e) => handleShapeSelect(e, el.id)}
                  onTap={(e) => handleShapeSelect(e, el.id)}
                  onDragMove={handleDragMove}
                />
              );
            }

            if (el.type === "rectangle") {
              return (
                <Rect
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  fill="transparent"
                  stroke={el.color}
                  strokeWidth={3}
                  draggable={selectedTool === "select" && !isReadOnly}
                  onClick={(e) => handleShapeSelect(e, el.id)}
                  onTap={(e) => handleShapeSelect(e, el.id)}
                  onDragMove={handleDragMove}
                  onTransformEnd={handleTransformEnd}
                />
              );
            }

            if (el.type === "circle") {
              return (
                <KonvaCircle
                  key={el.id}
                  id={el.id}
                  x={el.cx}
                  y={el.cy}
                  radius={el.r}
                  fill="transparent"
                  stroke={el.color}
                  strokeWidth={3}
                  draggable={selectedTool === "select" && !isReadOnly}
                  onClick={(e) => handleShapeSelect(e, el.id)}
                  onTap={(e) => handleShapeSelect(e, el.id)}
                  onDragMove={handleDragMove}
                  onTransformEnd={handleTransformEnd}
                />
              );
            }

            if (el.type === "sticky") {
              return (
                <Group
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  draggable={selectedTool === "select" && !isReadOnly}
                  onClick={(e) => handleShapeSelect(e, el.id)}
                  onTap={(e) => handleShapeSelect(e, el.id)}
                  onDblClick={(e) => handleDoubleClickSticky(e, el)}
                  onDblTap={(e) => handleDoubleClickSticky(e, el)}
                  onDragMove={handleDragMove}
                  onTransformEnd={handleTransformEnd}
                >
                  <Rect
                    width={el.width}
                    height={el.height}
                    fill={el.color === "#eff4ff" ? "#fef08a" : el.color}
                    stroke={isSelected ? "#2563eb" : "#e2e8f0"}
                    strokeWidth={isSelected ? 2 : 1}
                    cornerRadius={12}
                    shadowColor="#0f172a"
                    shadowBlur={10}
                    shadowOpacity={0.15}
                    shadowOffset={{ x: 0, y: 4 }}
                  />
                  <Text
                    x={12}
                    y={12}
                    text={
                      el.color === "#fef08a" || el.color === "#eff4ff"
                        ? "STICKY NOTE"
                        : "IDEA"
                    }
                    fontSize={9}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    fill={
                      getStickyTextColor(el.color) === "#ffffff"
                        ? "rgba(255, 255, 255, 0.7)"
                        : "#64748b"
                    }
                    letterSpacing={0.5}
                  />
                  {editingStickyId !== el.id && (
                    <Text
                      x={12}
                      y={28}
                      width={el.width - 24}
                      height={el.height - 40}
                      text={el.text}
                      fontSize={13}
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      fill={getStickyTextColor(el.color)}
                      align="center"
                      verticalAlign="middle"
                      wrap="char"
                    />
                  )}
                </Group>
              );
            }

            return null;
          })}

          {currentDrawingElement && (
            <Group>
              {currentDrawingElement.type === "stroke" && (
                <Line
                  points={currentDrawingElement.points.flatMap((p) => [
                    p.x,
                    p.y,
                  ])}
                  stroke={currentDrawingElement.color}
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.8}
                />
              )}
              {currentDrawingElement.type === "rectangle" && (
                <Rect
                  x={currentDrawingElement.x}
                  y={currentDrawingElement.y}
                  width={currentDrawingElement.width}
                  height={currentDrawingElement.height}
                  fill="transparent"
                  stroke={currentDrawingElement.color}
                  strokeWidth={3}
                  dash={[5, 3]}
                  opacity={0.8}
                />
              )}
              {currentDrawingElement.type === "circle" && (
                <KonvaCircle
                  x={currentDrawingElement.cx}
                  y={currentDrawingElement.cy}
                  radius={currentDrawingElement.r}
                  fill="transparent"
                  stroke={currentDrawingElement.color}
                  strokeWidth={3}
                  dash={[5, 3]}
                  opacity={0.8}
                />
              )}
            </Group>
          )}

          {selectedTool === "select" && !isReadOnly && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (
                  Math.abs(newBox.width) < 10 ||
                  Math.abs(newBox.height) < 10
                ) {
                  return oldBox;
                }
                return newBox;
              }}
              rotateEnabled={false}
            />
          )}
        </Layer>
      </Stage>

      {editingStickyId &&
        (() => {
          const el = displayedElements.find(
            (item) => item.id === editingStickyId,
          );
          if (!el) return null;
          const scale = zoom / 100;
          return (
            <textarea
              value={editingStickyText}
              onChange={(e) => setEditingStickyText(e.target.value)}
              onBlur={finishStickyEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  finishStickyEditing();
                }
              }}
              style={{
                position: "absolute",
                left: `${el.x * scale}px`,
                top: `${el.y * scale}px`,
                width: `${el.width * scale}px`,
                height: `${el.height * scale}px`,
                backgroundColor: el.color === "#eff4ff" ? "#fef08a" : el.color,
                fontSize: `${13 * scale}px`,
                zIndex: 100,
                border: "2px solid #2563eb",
                borderRadius: "12px",
                resize: "none",
                padding: `${16 * scale}px`,
                boxSizing: "border-box",
                outline: "none",
                textAlign: "center",
                fontFamily: "sans-serif",
                fontWeight: "bold",
                color: getStickyTextColor(el.color),
                overflow: "hidden",
                userSelect: "text",
                WebkitUserSelect: "text",
              }}
              className="select-text"
              ref={(tag) => {
                if (tag) {
                  tag.focus();
                  tag.select();
                }
              }}
            />
          );
        })()}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-card border border-outline-variant rounded-full px-4 py-2 shadow-md flex items-center gap-4 z-30 animate-in fade-in slide-in-from-bottom duration-300">
        <button
          onClick={() => setZoom(Math.max(25, zoom - 10))}
          className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <span className="font-body-md font-bold text-on-surface-variant w-12 text-center select-none text-xs">
          {zoom}%
        </span>
        <button
          onClick={() => setZoom(Math.min(200, zoom + 10))}
          className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>

        <div className="w-[1px] h-4 bg-outline-variant"></div>

        <button
          onClick={handleUndo}
          disabled={historyCount === 0}
          className={`p-1 transition-all flex items-center justify-center ${
            historyCount > 0
              ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-on-surface"
              : "text-outline/35 cursor-not-allowed"
          }`}
          title="Undo"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={handleRedo}
          disabled={redoCount === 0}
          className={`p-1 transition-all flex items-center justify-center ${
            redoCount > 0
              ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-on-surface"
              : "text-outline/35 cursor-not-allowed"
          }`}
          title="Redo"
        >
          <Redo2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default WhiteboardCanvas;
