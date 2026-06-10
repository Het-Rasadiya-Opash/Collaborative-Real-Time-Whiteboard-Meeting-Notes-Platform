import { Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";

const getStickyLabel = (color) => {
  if (!color) return "IDEA";
  const hex = color.toLowerCase();
  if (hex === "#2563eb") return "IDEA";
  if (hex === "#7c3aed") return "NOTE";
  if (hex === "#166534") return "TODO";
  if (hex === "#b45309") return "DECISION";
  if (hex === "#b91c1c") return "IMPORTANT";
  return "IDEA";
};

const CustomTextareaEditor = ({ initialText, value, onChange, onSave, style }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.selectionStart = ref.current.value.length;
      ref.current.selectionEnd = ref.current.value.length;
    }
  }, []);

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSave(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onSave(initialText);
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onSave(value)}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        ...style,
        lineHeight: "1.4",
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        outline: "none",
        boxShadow: "none",
        border: "none",
        resize: "none",
        background: "rgba(0, 0, 0, 0.05)",
        borderRadius: "4px",
        padding: "4px",
      }}
    />
  );
};

const WhiteboardCanvas = ({
  canvasRef,
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
  handleDoubleClickSticky,
  finishStickyEditing,
  handleUndo,
  handleRedo,
  historyCount,
  redoCount,
  pan,
  isPanning,
  isSpacePressed,
  updateElementsAndHistory,
  collaborators = [],
  currentUser,
}) => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedTool !== "select" || !selectedElementId || isReadOnly) {
      if (transformerRef.current) {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
      return;
    }

    if (stageRef.current && transformerRef.current) {
      const selectedNode = stageRef.current.findOne("#" + selectedElementId);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedElementId, displayedElements, selectedTool, isReadOnly]);

  const getShapeCenter = (el) => {
    if (el.type === 'rectangle' || el.type === 'sticky' || el.type === 'diamond' || el.type === 'triangle' || el.type === 'text') {
      const w = el.width || (el.type === 'text' ? 120 : 160);
      const h = el.height || (el.type === 'text' ? 30 : 160);
      return { x: el.x + w / 2, y: el.y + h / 2 };
    }
    if (el.type === 'circle') {
      return { x: el.cx, y: el.cy };
    }
    return null;
  };

  const updateConnectors = (elementsArray) => {
    return elementsArray.map(el => {
      if (el.type === 'arrow' || el.type === 'line') {
        let newPoints = [...el.points];
        let changed = false;
        
        if (el.startConnectedElementId) {
          const startTarget = elementsArray.find(e => e.id === el.startConnectedElementId);
          if (startTarget) {
            const center = getShapeCenter(startTarget);
            if (center) {
              newPoints[0] = center.x;
              newPoints[1] = center.y;
              changed = true;
            }
          }
        }
        
        if (el.endConnectedElementId) {
          const endTarget = elementsArray.find(e => e.id === el.endConnectedElementId);
          if (endTarget) {
            const center = getShapeCenter(endTarget);
            if (center) {
              newPoints[2] = center.x;
              newPoints[3] = center.y;
              changed = true;
            }
          }
        }
        
        if (changed) {
          return { ...el, points: newPoints };
        }
      }
      return el;
    });
  };

  const handleDragEnd = (e, id) => {
    if (isReadOnly) return;
    const node = e.target;
    const newX = node.x();
    const newY = node.y();

    let updated = displayedElements.map((el) => {
      if (el.id === id) {
        if (el.type === "sticky" || el.type === "rectangle" || el.type === "diamond" || el.type === "triangle" || el.type === "text") {
          return { ...el, x: newX, y: newY };
        } else if (el.type === "circle") {
          return { ...el, cx: newX, cy: newY };
        } else if (el.type === "stroke") {
          node.x(0);
          node.y(0);
          return {
            ...el,
            points: el.points.map((p) => ({
              x: p.x + newX,
              y: p.y + newY,
            })),
          };
        } else if (el.type === "arrow" || el.type === "line") {
          node.x(0);
          node.y(0);
          return {
            ...el,
            points: [
              el.points[0] + newX,
              el.points[1] + newY,
              el.points[2] + newX,
              el.points[3] + newY,
            ],
          };
        }
      }
      return el;
    });

    updated = updateConnectors(updated);
    updateElementsAndHistory(updated);
  };

  const handleTransformEnd = (e, id) => {
    if (isReadOnly) return;
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    let updated = displayedElements.map((el) => {
      if (el.id === id) {
        if (el.type === "rectangle" || el.type === "diamond" || el.type === "triangle" || el.type === "sticky") {
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, (el.width || 160) * scaleX),
            height: Math.max(5, (el.height || 160) * scaleY),
          };
        } else if (el.type === "circle") {
          const radius = Math.max(5, (el.r || 50) * Math.max(scaleX, scaleY));
          return {
            ...el,
            cx: node.x(),
            cy: node.y(),
            r: radius,
          };
        } else if (el.type === "text") {
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            fontSize: Math.max(8, (el.fontSize || 20) * Math.max(scaleX, scaleY)),
          };
        }
      }
      return el;
    });

    updated = updateConnectors(updated);
    updateElementsAndHistory(updated);
  };

  const editingElement = editingStickyId
    ? displayedElements.find((el) => el.id === editingStickyId)
    : null;

  const scale = zoom / 100;

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        if (canvasRef) canvasRef.current = el;
      }}
      className="w-full h-full relative overflow-hidden select-none bg-slate-50 canvas-grid"
      style={{
        cursor: isPanning || isSpacePressed
          ? (isPanning ? "grabbing" : "grab")
          : selectedTool === "select"
            ? "default"
            : "crosshair",
        backgroundImage: `radial-gradient(circle, #cbd5e1 1.5px, transparent 1.5px)`,
        backgroundSize: `${24 * scale}px ${24 * scale}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={pan.x}
        y={pan.y}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handleStageMouseDown}
        onTouchMove={handleStageMouseMove}
        onTouchEnd={handleStageMouseUp}
      >
        <Layer>
          {displayedElements.map((el) => {
            if (!el) return null;
            const isSelected = el.id === selectedElementId;
            const listening = selectedTool === "select";
            const canMoveSelected = listening && isSelected && !isReadOnly;

            const selectedByOther = collaborators.find(
              (c) => c.selectedElementId === el.id && c.userId !== currentUser?._id
            );
            const otherSelectionColor = "#7c3aed"; // Purple indicator

            const renderSelectionGlow = (shapeType) => {
              if (!selectedByOther) return null;
              
              if (shapeType === "rectangle" || shapeType === "sticky" || shapeType === "diamond" || shapeType === "triangle") {
                return (
                  <Rect
                    x={el.x}
                    y={el.y}
                    width={el.width || 160}
                    height={el.height || 160}
                    stroke={otherSelectionColor}
                    strokeWidth={3}
                    shadowColor={otherSelectionColor}
                    shadowBlur={10}
                    shadowOpacity={0.6}
                    listening={false}
                  />
                );
              }
              if (shapeType === "circle") {
                return (
                  <Circle
                    x={el.cx}
                    y={el.cy}
                    radius={el.r}
                    stroke={otherSelectionColor}
                    strokeWidth={3}
                    shadowColor={otherSelectionColor}
                    shadowBlur={10}
                    shadowOpacity={0.6}
                    listening={false}
                  />
                );
              }
              // For text, line, arrow, we can just draw a bounding rect
              return null;
            };

            if (el.type === "stroke") {
              return (
                <Group key={el.id}>
                  <Line
                    id={el.id}
                    points={el.points.flatMap((p) => [p.x, p.y])}
                    stroke={el.color}
                    strokeWidth={el.strokeWidth || 4}
                    lineCap="round"
                    lineJoin="round"
                    listening={listening}
                    draggable={canMoveSelected}
                    onClick={(e) => handleShapeSelect(e, el.id)}
                    onTap={(e) => handleShapeSelect(e, el.id)}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                  />
                  {selectedByOther && (() => {
                    const xs = el.points.map(p => p.x);
                    const ys = el.points.map(p => p.y);
                    const minX = Math.min(...xs) - 10;
                    const minY = Math.min(...ys) - 10;
                    const width = Math.max(...xs) - Math.min(...xs) + 20;
                    const height = Math.max(...ys) - Math.min(...ys) + 20;
                    return (
                      <Rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        stroke={otherSelectionColor}
                        strokeWidth={2}
                        listening={false}
                      />
                    );
                  })()}
                </Group>
              );
            }

            if (el.type === "rectangle") {
              return (
                <Group key={el.id}>
                  <Rect
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    stroke={el.color}
                    strokeWidth={3}
                    fill="transparent"
                    listening={listening}
                    draggable={canMoveSelected}
                    onClick={(e) => handleShapeSelect(e, el.id)}
                    onTap={(e) => handleShapeSelect(e, el.id)}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  />
                  {renderSelectionGlow("rectangle")}
                </Group>
              );
            }

            if (el.type === "circle") {
              return (
                <Group key={el.id}>
                  <Circle
                    id={el.id}
                    x={el.cx}
                    y={el.cy}
                    radius={el.r}
                    stroke={el.color}
                    strokeWidth={3}
                    fill="transparent"
                    listening={listening}
                    draggable={canMoveSelected}
                    onClick={(e) => handleShapeSelect(e, el.id)}
                    onTap={(e) => handleShapeSelect(e, el.id)}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  />
                  {renderSelectionGlow("circle")}
                </Group>
              );
            }

            if (el.type === "arrow" || el.type === "line") {
              return (
                <Group key={el.id}>
                  {el.type === "arrow" ? (
                    <Arrow
                      id={el.id}
                      points={el.points}
                      stroke={el.color}
                      fill={el.color}
                      strokeWidth={el.strokeWidth || 4}
                      pointerLength={12}
                      pointerWidth={12}
                      listening={listening}
                      draggable={canMoveSelected}
                      onClick={(e) => handleShapeSelect(e, el.id)}
                      onTap={(e) => handleShapeSelect(e, el.id)}
                      onDragEnd={(e) => handleDragEnd(e, el.id)}
                    />
                  ) : (
                    <Line
                      id={el.id}
                      points={el.points}
                      stroke={el.color}
                      strokeWidth={el.strokeWidth || 4}
                      lineCap="round"
                      lineJoin="round"
                      listening={listening}
                      draggable={canMoveSelected}
                      onClick={(e) => handleShapeSelect(e, el.id)}
                      onTap={(e) => handleShapeSelect(e, el.id)}
                      onDragEnd={(e) => handleDragEnd(e, el.id)}
                    />
                  )}
                  {selectedByOther && (() => {
                    const minX = Math.min(el.points[0], el.points[2]) - 10;
                    const minY = Math.min(el.points[1], el.points[3]) - 10;
                    const width = Math.abs(el.points[0] - el.points[2]) + 20;
                    const height = Math.abs(el.points[1] - el.points[3]) + 20;
                    return (
                      <Rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        stroke={otherSelectionColor}
                        strokeWidth={2}
                        listening={false}
                      />
                    );
                  })()}
                </Group>
              );
            }

            if (el.type === "diamond") {
              const pts = [
                el.x + el.width / 2, el.y,
                el.x + el.width, el.y + el.height / 2,
                el.x + el.width / 2, el.y + el.height,
                el.x, el.y + el.height / 2
              ];
              return (
                <Group key={el.id}>
                  <Line
                    id={el.id}
                    points={pts}
                    closed={true}
                    stroke={el.color}
                    strokeWidth={3}
                    fill="transparent"
                    listening={listening}
                    draggable={canMoveSelected}
                    onClick={(e) => handleShapeSelect(e, el.id)}
                    onTap={(e) => handleShapeSelect(e, el.id)}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  />
                  {renderSelectionGlow("diamond")}
                </Group>
              );
            }

            if (el.type === "triangle") {
              const pts = [
                el.x + el.width / 2, el.y,
                el.x + el.width, el.y + el.height,
                el.x, el.y + el.height
              ];
              return (
                <Group key={el.id}>
                  <Line
                    id={el.id}
                    points={pts}
                    closed={true}
                    stroke={el.color}
                    strokeWidth={3}
                    fill="transparent"
                    listening={listening}
                    draggable={canMoveSelected}
                    onClick={(e) => handleShapeSelect(e, el.id)}
                    onTap={(e) => handleShapeSelect(e, el.id)}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  />
                  {renderSelectionGlow("triangle")}
                </Group>
              );
            }


            if (el.type === "text") {
              return (
                <Group key={el.id}>
                  <Text
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    text={editingStickyId === el.id ? "" : el.text}
                    fontSize={el.fontSize || 20}
                    fill={el.color}
                    fontStyle="bold"
                    fontFamily="sans-serif"
                    listening={listening}
                    draggable={canMoveSelected}
                    onClick={(e) => handleShapeSelect(e, el.id)}
                    onTap={(e) => handleShapeSelect(e, el.id)}
                    onDblClick={(e) => handleDoubleClickSticky(e, el)}
                    onDblTap={(e) => handleDoubleClickSticky(e, el)}
                    onDragEnd={(e) => handleDragEnd(e, el.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                  />
                  {selectedByOther && (
                    <Rect
                      x={el.x - 4}
                      y={el.y - 4}
                      width={(el.text?.length || 10) * (el.fontSize || 20) * 0.6 + 8}
                      height={(el.fontSize || 20) + 8}
                      stroke={otherSelectionColor}
                      strokeWidth={2}
                      listening={false}
                    />
                  )}
                </Group>
              );
            }

            if (el.type === "sticky") {
              const width = el.width || 160;
              const height = el.height || 160;
              const isEditing = editingStickyId === el.id;
              return (
                <Group
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  listening={listening}
                  draggable={canMoveSelected}
                  onClick={(e) => handleShapeSelect(e, el.id)}
                  onTap={(e) => handleShapeSelect(e, el.id)}
                  onDblClick={(e) => handleDoubleClickSticky(e, el)}
                  onDblTap={(e) => handleDoubleClickSticky(e, el)}
                  onDragEnd={(e) => handleDragEnd(e, el.id)}
                  onTransformEnd={(e) => handleTransformEnd(e, el.id)}
                >
                  <Rect
                    width={width}
                    height={height}
                    fill={el.color}
                    cornerRadius={12}
                    shadowColor="#000000"
                    shadowBlur={8}
                    shadowOpacity={0.12}
                    shadowOffset={{ x: 2, y: 2 }}
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth={1}
                  />
                  <Text
                    x={12}
                    y={12}
                    text={getStickyLabel(el.color)}
                    fontSize={9}
                    fill="rgba(255, 255, 255, 0.75)"
                    fontStyle="bold"
                    fontFamily="sans-serif"
                    letterSpacing={1.2}
                  />
                  <Text
                    x={12}
                    y={32}
                    width={width - 24}
                    height={height - 44}
                    text={isEditing ? "" : el.text || "Double-click to edit note"}
                    fontSize={13}
                    fill="#ffffff"
                    fontStyle="bold"
                    fontFamily="sans-serif"
                    align="left"
                    verticalAlign="top"
                    wrap="char"
                  />
                  {renderSelectionGlow("sticky")}
                  {selectedByOther && (
                    <Text
                      x={0}
                      y={-20}
                      text={`${selectedByOther.username} is editing`}
                      fill={otherSelectionColor}
                      fontSize={12}
                      fontStyle="bold"
                    />
                  )}
                </Group>
              );
            }

            return null;
          })}

          {currentDrawingElement && (
            <>
              {currentDrawingElement.type === "stroke" && (
                <Line
                  points={currentDrawingElement.points.flatMap((p) => [p.x, p.y])}
                  stroke={currentDrawingElement.color}
                  strokeWidth={currentDrawingElement.strokeWidth || 4}
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
                  stroke={currentDrawingElement.color}
                  strokeWidth={3}
                  strokeScaleEnabled={false}
                  dash={[4, 4]}
                  opacity={0.8}
                />
              )}
              {currentDrawingElement.type === "circle" && (
                <Circle
                  x={currentDrawingElement.cx}
                  y={currentDrawingElement.cy}
                  radius={currentDrawingElement.r}
                  stroke={currentDrawingElement.color}
                  strokeWidth={3}
                  strokeScaleEnabled={false}
                  dash={[4, 4]}
                  opacity={0.8}
                />
              )}
              {currentDrawingElement.type === "arrow" && (
                <Arrow
                  points={currentDrawingElement.points}
                  stroke={currentDrawingElement.color}
                  fill={currentDrawingElement.color}
                  strokeWidth={currentDrawingElement.strokeWidth || 4}
                  pointerLength={12}
                  pointerWidth={12}
                  opacity={0.8}
                />
              )}
              {currentDrawingElement.type === "line" && (
                <Line
                  points={currentDrawingElement.points}
                  stroke={currentDrawingElement.color}
                  strokeWidth={currentDrawingElement.strokeWidth || 4}
                  lineCap="round"
                  lineJoin="round"
                  opacity={0.8}
                />
              )}
              {currentDrawingElement.type === "diamond" && (
                <Line
                  points={[
                    currentDrawingElement.x + currentDrawingElement.width / 2, currentDrawingElement.y,
                    currentDrawingElement.x + currentDrawingElement.width, currentDrawingElement.y + currentDrawingElement.height / 2,
                    currentDrawingElement.x + currentDrawingElement.width / 2, currentDrawingElement.y + currentDrawingElement.height,
                    currentDrawingElement.x, currentDrawingElement.y + currentDrawingElement.height / 2
                  ]}
                  closed={true}
                  stroke={currentDrawingElement.color}
                  strokeWidth={3}
                  strokeScaleEnabled={false}
                  dash={[4, 4]}
                  opacity={0.8}
                />
              )}
              {currentDrawingElement.type === "triangle" && (
                <Line
                  points={[
                    currentDrawingElement.x + currentDrawingElement.width / 2, currentDrawingElement.y,
                    currentDrawingElement.x + currentDrawingElement.width, currentDrawingElement.y + currentDrawingElement.height,
                    currentDrawingElement.x, currentDrawingElement.y + currentDrawingElement.height
                  ]}
                  closed={true}
                  stroke={currentDrawingElement.color}
                  strokeWidth={3}
                  strokeScaleEnabled={false}
                  dash={[4, 4]}
                  opacity={0.8}
                />
              )}
            </>
          )}

          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
            keepRatio={false}
            enabledAnchors={[
              "top-left",
              "top-center",
              "top-right",
              "middle-right",
              "bottom-right",
              "bottom-center",
              "bottom-left",
              "middle-left",
            ]}
            anchorCornerRadius={3}
            anchorSize={8}
            anchorStroke="#ef4444"
            anchorFill="#ffffff"
            borderStroke="#ef4444"
            borderStrokeWidth={1.5}
          />
        </Layer>
      </Stage>

      {editingElement && (
        <>
          {editingElement.type === "sticky" && (
            <CustomTextareaEditor
              key={editingElement.id}
              initialText={editingElement.text}
              value={editingStickyText}
              onChange={setEditingStickyText}
              onSave={(newText) => finishStickyEditing(newText)}
              style={{
                position: "absolute",
                left: `${editingElement.x * scale + pan.x + 12 * scale}px`,
                top: `${editingElement.y * scale + pan.y + 32 * scale}px`,
                width: `${((editingElement.width || 160) - 24) * scale}px`,
                height: `${((editingElement.height || 160) - 44) * scale}px`,
                color: "#ffffff",
                fontSize: `${13 * scale}px`,
                fontWeight: "bold",
                fontFamily: "sans-serif",
              }}
            />
          )}
          {editingElement.type === "text" && (
            <CustomTextareaEditor
              key={editingElement.id}
              initialText={editingElement.text}
              value={editingStickyText}
              onChange={setEditingStickyText}
              onSave={(newText) => finishStickyEditing(newText)}
              style={{
                position: "absolute",
                left: `${editingElement.x * scale + pan.x}px`,
                top: `${editingElement.y * scale + pan.y}px`,
                width: `${Math.max(160, 160 * scale)}px`,
                height: `${Math.max(48, 48 * scale)}px`,
                color: editingElement.color || "#1e293b",
                fontSize: `${(editingElement.fontSize || 20) * scale}px`,
                fontWeight: "bold",
                fontFamily: "sans-serif",
              }}
            />
          )}
        </>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-[calc(50%+180px)] glass-panel rounded-full px-6 py-2 flex items-center gap-4 z-30 animate-in fade-in slide-in-from-bottom duration-300 pointer-events-auto shadow-lg bg-white/95 backdrop-blur-md border border-slate-200">
        <button
          onClick={() => setZoom(Math.max(25, zoom - 10))}
          className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center text-slate-700"
          title="Zoom Out"
        >
          <ZoomOut size={18} />
        </button>
        <span className="font-bold text-slate-700 w-10 text-center select-none text-xs">
          {zoom}%
        </span>
        <button
          onClick={() => setZoom(Math.min(200, zoom + 10))}
          className="p-1 hover:text-primary transition-colors cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center text-slate-700"
          title="Zoom In"
        >
          <ZoomIn size={18} />
        </button>

        <div className="w-[1px] h-4 bg-slate-200"></div>

        <button
          onClick={handleUndo}
          disabled={historyCount === 0}
          className={`p-1 transition-all flex items-center justify-center ${
            historyCount > 0
              ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-slate-700"
              : "text-slate-300 cursor-not-allowed"
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
              ? "hover:text-primary hover:scale-105 active:scale-95 cursor-pointer text-slate-700"
              : "text-slate-300 cursor-not-allowed"
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
