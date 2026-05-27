import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export const useWhiteboardCanvas = ({
  elements,
  setElements,
  selectedTool,
  setSelectedTool,
  currentColor,
  selectedElementId,
  setSelectedElementId,
  zoom,
  isReadOnly,
  previewSnapshot,
  socketRef,
  board,
  currentUser,
  canvasMapRef,
  ydocRef,
  lastCursorEmitRef,
  triggerAutoSave,
  canvasRef,
}) => {
  const [pan, setPan] = useState({ x: 100, y: 20 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElementId, setDraggedElementId] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragInitialCoords, setDragInitialCoords] = useState({ x: 0, y: 0 });

  const [currentDrawingElement, setCurrentDrawingElement] = useState(null);
  const [editingStickyId, setEditingStickyId] = useState(null);
  const [editingStickyText, setEditingStickyText] = useState("");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const getRelativeCoords = (clientX, clientY) => {
    if (!canvasRef?.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = zoom / 100;
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale,
    };
  };

  const updateElementsAndHistory = (newElements) => {
    setHistory((prev) => [...prev, elementsRef.current]);
    setRedoStack([]);
    setElements(newElements);
    triggerAutoSave(newElements);

    if (canvasMapRef?.current && ydocRef?.current) {
      ydocRef.current.transact(() => {
        const currentKeys = new Set(canvasMapRef.current.keys());
        const newIds = new Set(newElements.map((el) => el.id));

        for (const key of currentKeys) {
          if (!newIds.has(key)) {
            canvasMapRef.current.delete(key);
          }
        }

        newElements.forEach((el) => {
          if (el && el.id) {
            const existing = canvasMapRef.current.get(el.id);
            if (JSON.stringify(existing) !== JSON.stringify(el)) {
              canvasMapRef.current.set(el.id, el);
            }
          }
        });
      });
    }

    if (socketRef?.current?.connected) {
      socketRef.current.emit("canvas-change", {
        boardId: board._id,
        elements: newElements,
      });
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, elementsRef.current]);
    setElements(previous);
    triggerAutoSave(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, elementsRef.current]);
    setElements(next);
    triggerAutoSave(next);
  };

  const finishStickyEditing = (textOverride) => {
    if (!editingStickyId) return;

    const finalVal =
      textOverride !== undefined ? textOverride : editingStickyText;

    const updated = elementsRef.current.map((el) => {
      if (el.id === editingStickyId) {
        return {
          ...el,
          text:
            finalVal && finalVal.trim() !== ""
              ? finalVal
              : "Double-click to edit note",
        };
      }
      return el;
    });

    updateElementsAndHistory(updated);
    setEditingStickyId(null);
    setEditingStickyText("");
  };

  const handleStageMouseDown = (e) => {
    if (isReadOnly || previewSnapshot) return;

    if (editingStickyId) {
      finishStickyEditing();
    }

    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const clickedOnBg =
      e.target === e.currentTarget || e.target.id === "canvas-grid";
    if (clickedOnBg) {
      setSelectedElementId(null);
    }

    if (selectedTool === "select") {
      if (clickedOnBg) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    } else if (selectedTool === "eraser") {
      const { x, y } = getRelativeCoords(e.clientX, e.clientY);
      const updated = elementsRef.current.filter((el) => {
        if (el.type === "sticky" || el.type === "rectangle") {
          return !(
            x >= el.x &&
            x <= el.x + el.width &&
            y >= el.y &&
            y <= el.y + el.height
          );
        }
        if (el.type === "circle") {
          const dx = x - el.cx;
          const dy = y - el.cy;
          return Math.sqrt(dx * dx + dy * dy) > el.r;
        }
        if (el.type === "stroke") {
          return !el.points.some((p) => {
            const dx = x - p.x;
            const dy = y - p.y;
            return Math.sqrt(dx * dx + dy * dy) < 15;
          });
        }
        return true;
      });
      if (updated.length !== elementsRef.current.length) {
        updateElementsAndHistory(updated);
      }
    } else {
      const { x, y } = getRelativeCoords(e.clientX, e.clientY);
      const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      if (selectedTool === "pencil") {
        const newStroke = {
          id,
          type: "stroke",
          points: [{ x, y }],
          color: currentColor,
          strokeWidth: 4,
        };
        setIsDragging(true);
        setCurrentDrawingElement(newStroke);
      } else if (selectedTool === "rectangle") {
        const newRect = {
          id,
          type: "rectangle",
          x,
          y,
          width: 0,
          height: 0,
          color: currentColor,
        };
        setIsDragging(true);
        setCurrentDrawingElement(newRect);
      } else if (selectedTool === "circle") {
        const newCircle = {
          id,
          type: "circle",
          cx: x,
          cy: y,
          r: 0,
          color: currentColor,
        };
        setIsDragging(true);
        setCurrentDrawingElement(newCircle);
      } else if (selectedTool === "sticky") {
        const newSticky = {
          id,
          type: "sticky",
          x: x - 80,
          y: y - 80,
          width: 160,
          height: 160,
          text: "Double-click to edit note",
          color: currentColor,
        };
        const newElements = [...elementsRef.current, newSticky];
        updateElementsAndHistory(newElements);
        setSelectedTool("select");
        setSelectedElementId(id);
        setIsDragging(false);
      }
    }
  };

  const handleStageMouseMove = (e) => {
    if (previewSnapshot) return;

    if (socketRef?.current?.connected) {
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 40) {
        const { x, y } = getRelativeCoords(e.clientX, e.clientY);
        socketRef.current.emit("cursor-move", {
          boardId: board._id,
          x,
          y,
          userId:
            currentUser?._id ||
            `guest_${Math.random().toString(36).substring(2, 6)}`,
          username: currentUser?.username || "Guest Collaborator",
        });
        lastCursorEmitRef.current = now;
      }
    }

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (draggedElementId) {
      const scale = zoom / 100;
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;

      const updated = elementsRef.current.map((el) => {
        if (el.id === draggedElementId) {
          if (el.type === "sticky" || el.type === "rectangle") {
            return {
              ...el,
              x: dragInitialCoords.x + dx,
              y: dragInitialCoords.y + dy,
            };
          } else if (el.type === "circle") {
            return {
              ...el,
              cx: dragInitialCoords.x + dx,
              cy: dragInitialCoords.y + dy,
            };
          } else if (el.type === "stroke") {
            return {
              ...el,
              points: el.points.map((p, idx) => ({
                x: dragInitialCoords.points[idx].x + dx,
                y: dragInitialCoords.points[idx].y + dy,
              })),
            };
          }
        }
        return el;
      });

      setElements(updated);

      if (socketRef?.current?.connected) {
        socketRef.current.emit("canvas-change", {
          boardId: board._id,
          elements: updated,
        });
      }
      return;
    }

    if (!isDragging) return;

    if (currentDrawingElement) {
      const { x, y } = getRelativeCoords(e.clientX, e.clientY);
      const updated = { ...currentDrawingElement };
      if (updated.type === "stroke") {
        updated.points = [...updated.points, { x, y }];
      } else if (updated.type === "rectangle") {
        updated.width = x - updated.x;
        updated.height = y - updated.y;
      } else if (updated.type === "circle") {
        const dx = x - updated.cx;
        const dy = y - updated.cy;
        updated.r = Math.sqrt(dx * dx + dy * dy);
      }
      setCurrentDrawingElement(updated);
    }
  };

  const handleStageMouseUp = () => {
    if (previewSnapshot) return;

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (draggedElementId) {
      setDraggedElementId(null);
      triggerAutoSave(elementsRef.current);
      return;
    }

    setIsDragging(false);

    if (currentDrawingElement) {
      let el = currentDrawingElement;
      if (el.type === "rectangle") {
        let x = el.x;
        let y = el.y;
        let w = el.width;
        let h = el.height;
        if (w < 0) {
          x += w;
          w = Math.abs(w);
        }
        if (h < 0) {
          y += h;
          h = Math.abs(h);
        }
        el = { ...el, x, y, width: w, height: h };
      }

      const newElements = [...elementsRef.current, el];
      updateElementsAndHistory(newElements);
      setCurrentDrawingElement(null);
    }
  };

  const handleShapeSelect = (e, id) => {
    if (selectedTool !== "select" || isReadOnly || previewSnapshot) return;
    e.stopPropagation();
    setSelectedElementId(id);

    if (editingStickyId === id) return;

    const el = elementsRef.current.find((item) => item.id === id);
    if (el) {
      setDraggedElementId(id);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (el.type === "sticky" || el.type === "rectangle") {
        setDragInitialCoords({ x: el.x, y: el.y });
      } else if (el.type === "circle") {
        setDragInitialCoords({ x: el.cx, y: el.cy });
      } else if (el.type === "stroke") {
        setDragInitialCoords({ points: [...el.points] });
      }
    }
  };

  const handleDoubleClickSticky = (e, element) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (element.type === "sticky") {
      setEditingStickyId(element.id);
      setEditingStickyText(
        element.text === "Double-click to edit note" ? "" : element.text,
      );
      setDraggedElementId(null);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elementsRef.current.filter(
      (el) => el.id !== selectedElementId,
    );
    updateElementsAndHistory(updated);
    setSelectedElementId(null);
    toast.success("Element deleted");
  };

  const handleClearCanvas = () => {
    if (
      window.confirm(
        "Are you sure you want to clear the entire whiteboard canvas?",
      )
    ) {
      updateElementsAndHistory([]);
      setSelectedElementId(null);
      toast.success("Canvas cleared");
    }
  };

  const isCanvasBusy =
    isDragging ||
    currentDrawingElement !== null ||
    editingStickyId !== null ||
    isPanning;

  return {
    pan,
    setPan,
    isPanning,
    isDragging,
    currentDrawingElement,
    editingStickyId,
    editingStickyText,
    setEditingStickyText,
    history,
    redoStack,
    getRelativeCoords,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleShapeSelect,
    handleDoubleClickSticky,
    finishStickyEditing,
    handleDeleteSelected,
    handleClearCanvas,
    handleUndo,
    handleRedo,
    isCanvasBusy,
  };
};
