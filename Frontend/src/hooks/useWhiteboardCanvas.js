import { useState, useEffect } from "react";
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
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentDrawingElement, setCurrentDrawingElement] = useState(null);
  const [editingStickyId, setEditingStickyId] = useState(null);
  const [editingStickyText, setEditingStickyText] = useState("");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const getStageMouseCoords = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    const scale = zoom / 100;
    return {
      x: pos.x / scale,
      y: pos.y / scale,
    };
  };

  const updateElementsAndHistory = (newElements) => {
    setHistory((prev) => [...prev, elements]);
    setRedoStack([]);
    setElements(newElements);
    triggerAutoSave(newElements);

    if (canvasMapRef.current && ydocRef.current) {
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

    if (socketRef.current?.connected) {
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
    setRedoStack((prev) => [...prev, elements]);
    setElements(previous);
    triggerAutoSave(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, elements]);
    setElements(next);
    triggerAutoSave(next);
  };

  const finishStickyEditing = () => {
    if (!editingStickyId) return;

    const updated = elements.map((el) => {
      if (el.id === editingStickyId) {
        return {
          ...el,
          text: editingStickyText.trim() || "Sticky note text",
        };
      }
      return el;
    });

    updateElementsAndHistory(updated);
    setEditingStickyId(null);
    setEditingStickyText("");
  };

  const handleStageMouseDown = (e) => {
    console.log(
      "Stage MouseDown: isReadOnly =",
      isReadOnly,
      "selectedTool =",
      selectedTool,
      "previewSnapshot =",
      !!previewSnapshot,
    );
    if (isReadOnly || previewSnapshot) return;
    if (editingStickyId) {
      finishStickyEditing();
      return;
    }

    const clickedOnEmpty =
      e.target === e.target.getStage() || e.target.id() === "stage-background";
    if (clickedOnEmpty) {
      setSelectedElementId(null);
    }

    if (selectedTool !== "select") {
      const { x, y } = getStageMouseCoords(e);
      const id = `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      if (selectedTool === "pencil") {
        const newStroke = {
          id,
          type: "stroke",
          points: [{ x, y }],
          color: currentColor,
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
          color: currentColor === "#eff4ff" ? "#fef08a" : currentColor,
        };
        const newElements = [...elements, newSticky];
        updateElementsAndHistory(newElements);
        setSelectedTool("select");
        setSelectedElementId(id);
        setIsDragging(false);
      }
    }
  };

  const handleStageMouseMove = (e) => {
    if (previewSnapshot) return;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    if (pos && socketRef.current?.connected) {
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 40) {
        const scale = zoom / 100;
        socketRef.current.emit("cursor-move", {
          boardId: board._id,
          x: pos.x / scale,
          y: pos.y / scale,
          userId:
            currentUser?._id ||
            `guest_${Math.random().toString(36).substring(2, 6)}`,
          username: currentUser?.username || "Guest Collaborator",
        });
        lastCursorEmitRef.current = now;
      }
    }

    if (!isDragging) return;
    console.log(
      "Stage MouseMove: currentDrawingElement =",
      currentDrawingElement,
    );

    if (currentDrawingElement) {
      const { x, y } = getStageMouseCoords(e);
      const updated = { ...currentDrawingElement };
      if (updated.type === "stroke") {
        updated.points = [...updated.points, { x, y }];
      } else if (updated.type === "rectangle") {
        updated.width = Math.max(0, x - updated.x);
        updated.height = Math.max(0, y - updated.y);
      } else if (updated.type === "circle") {
        const dx = x - updated.cx;
        const dy = y - updated.cy;
        updated.r = Math.sqrt(dx * dx + dy * dy);
      }
      setCurrentDrawingElement(updated);
    }
  };

  const handleStageMouseUp = () => {
    console.log(
      "Stage MouseUp: currentDrawingElement =",
      currentDrawingElement,
    );
    if (previewSnapshot) return;
    setIsDragging(false);

    if (currentDrawingElement) {
      const newElements = [...elements, currentDrawingElement];
      updateElementsAndHistory(newElements);
      setCurrentDrawingElement(null);
    }
  };

  const handleShapeSelect = (e, id) => {
    if (selectedTool !== "select" || isReadOnly || previewSnapshot) return;
    e.cancelBubble = true;
    setSelectedElementId(id);
  };

  const handleTransformEnd = (e) => {
    if (isReadOnly || previewSnapshot) return;
    const node = e.target;
    const id = node.id();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const updated = elements.map((el) => {
      if (el.id === id) {
        if (el.type === "rectangle" || el.type === "sticky") {
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, el.width * scaleX),
            height: Math.max(5, el.height * scaleY),
          };
        } else if (el.type === "circle") {
          return {
            ...el,
            cx: node.x(),
            cy: node.y(),
            r: Math.max(5, el.r * Math.max(scaleX, scaleY)),
          };
        }
      }
      return el;
    });

    updateElementsAndHistory(updated);
  };

  const handleDragMove = (e) => {
    if (isReadOnly || previewSnapshot) return;
    const node = e.target;
    const id = node.id();

    setElements((prevElements) => {
      let movedEl = null;
      const updated = prevElements.map((el) => {
        if (el.id !== id) return el;
        if (el.type === "rectangle" || el.type === "sticky") {
          movedEl = { ...el, x: node.x(), y: node.y() };
          return movedEl;
        } else if (el.type === "circle") {
          movedEl = { ...el, cx: node.x(), cy: node.y() };
          return movedEl;
        } else if (el.type === "stroke") {
          const dx = node.x();
          const dy = node.y();
          node.x(0);
          node.y(0);
          const newPoints = el.points.map((pt) => ({
            x: pt.x + dx,
            y: pt.y + dy,
          }));
          movedEl = { ...el, points: newPoints };
          return movedEl;
        }
        return el;
      });

      if (movedEl && canvasMapRef.current) {
        canvasMapRef.current.set(movedEl.id, movedEl);
      }

      triggerAutoSave(updated);

      if (socketRef.current?.connected) {
        socketRef.current.emit("canvas-change", {
          boardId: board._id,
          elements: updated,
        });
      }

      return updated;
    });
  };

  const handleDoubleClickSticky = (e, element) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (element.type === "sticky") {
      setEditingStickyId(element.id);
      setEditingStickyText(
        element.text === "Double-click to edit note" ? "" : element.text,
      );
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedElementId) return;
    const updated = elements.filter((el) => el.id !== selectedElementId);
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
    isDragging || currentDrawingElement !== null || editingStickyId !== null;

  return {
    isDragging,
    currentDrawingElement,
    editingStickyId,
    editingStickyText,
    setEditingStickyText,
    history,
    redoStack,
    getStageMouseCoords,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleShapeSelect,
    handleTransformEnd,
    handleDragMove,
    handleDoubleClickSticky,
    finishStickyEditing,
    handleDeleteSelected,
    handleClearCanvas,
    handleUndo,
    handleRedo,
    isCanvasBusy,
  };
};
