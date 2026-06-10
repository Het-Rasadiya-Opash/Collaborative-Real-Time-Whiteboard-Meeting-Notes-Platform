import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { enqueueOperation } from "../utils/offlineQueue";

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

  const [currentDrawingElement, setCurrentDrawingElement] = useState(null);
  const [editingStickyId, setEditingStickyId] = useState(null);
  const [editingStickyText, setEditingStickyText] = useState("");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  const [clipboardElement, setClipboardElement] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, elementsRef.current]);
    setElements(previous);
    triggerAutoSave(previous);
  }, [history, setElements, triggerAutoSave]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, elementsRef.current]);
    setElements(next);
    triggerAutoSave(next);
  }, [redoStack, setElements, triggerAutoSave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isReadOnly) return;
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }
      if (editingStickyId) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          const updated = elementsRef.current.filter((el) => el.id !== selectedElementId);
          updateElementsAndHistory(updated);
          setSelectedElementId(null);
          toast.success("Element deleted");
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedElementId) {
          e.preventDefault();
          const el = elementsRef.current.find(e => e.id === selectedElementId);
          if (el) {
            setClipboardElement(el);
            toast.success("Element copied");
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardElement) {
          e.preventDefault();
          const newId = `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const newEl = { ...clipboardElement, id: newId };
          
          if (newEl.x !== undefined) newEl.x += 20;
          if (newEl.y !== undefined) newEl.y += 20;
          if (newEl.cx !== undefined) newEl.cx += 20;
          if (newEl.cy !== undefined) newEl.cy += 20;
          if (newEl.points && Array.isArray(newEl.points)) {
            if (newEl.type === 'stroke') {
              newEl.points = newEl.points.map(p => ({ x: p.x + 20, y: p.y + 20 }));
            } else {
              newEl.points = newEl.points.map(val => val + 20);
            }
          }
          
          const newElements = [...elementsRef.current, newEl];
          updateElementsAndHistory(newElements);
          setSelectedElementId(newId);
          setSelectedTool("select");
          toast.success("Element pasted");
        }
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isReadOnly, editingStickyId, selectedElementId, clipboardElement, handleUndo, handleRedo]);

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
    } else {
      enqueueOperation({
        type: "canvas-change",
        payload: {
          boardId: board._id,
          elements: newElements,
        },
      });
      toast("Saved offline. Will sync when reconnected.", { icon: "🔌" });
    }
  };



  const finishStickyEditing = (textOverride) => {
    if (!editingStickyId) return;

    const finalVal =
      textOverride !== undefined ? textOverride : editingStickyText;

    const updated = elementsRef.current.map((el) => {
      if (el.id === editingStickyId) {
        const defaultText = el.type === "text" ? "Double-click to edit text" : "Double-click to edit note";
        return {
          ...el,
          text:
            finalVal && finalVal.trim() !== ""
              ? finalVal
              : defaultText,
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

    const evt = e.evt || e;

    if (evt.button === 1 || evt.evt?.button === 1 || evt.button === 2 || evt.evt?.button === 2 || isSpacePressed) {
      if (evt.preventDefault) evt.preventDefault();
      setIsPanning(true);
      setPanStart({ x: evt.clientX - pan.x, y: evt.clientY - pan.y });
      return;
    }

    const clickedOnBg =
      e.target === e.currentTarget ||
      e.target.id === "canvas-grid" ||
      (e.target && typeof e.target.getStage === "function" && e.target === e.target.getStage());

    if (clickedOnBg) {
      setSelectedElementId(null);
    }

    if (selectedTool === "select") {
      if (clickedOnBg) {
        setIsPanning(true);
        setPanStart({ x: evt.clientX - pan.x, y: evt.clientY - pan.y });
      }
    } else if (selectedTool === "eraser") {
      const { x, y } = getRelativeCoords(evt.clientX, evt.clientY);
      const updated = elementsRef.current.filter((el) => {
        if (el.type === "sticky" || el.type === "rectangle" || el.type === "text") {
          const w = el.width || (el.type === "text" ? 120 : 160);
          const h = el.height || (el.type === "text" ? 30 : 160);
          return !(
            x >= el.x &&
            x <= el.x + w &&
            y >= el.y &&
            y <= el.y + h
          );
        }
        if (el.type === "circle") {
          const dx = x - el.cx;
          const dy = y - el.cy;
          return Math.sqrt(dx * dx + dy * dy) > el.r;
        }
        if (el.type === "arrow" && Array.isArray(el.points) && el.points.length >= 4) {
          const startX = el.points[0];
          const startY = el.points[1];
          const endX = el.points[2];
          const endY = el.points[3];
          const l2 = (startX - endX) ** 2 + (startY - endY) ** 2;
          if (l2 === 0) return Math.sqrt((x - startX) ** 2 + (y - startY) ** 2) > 15;
          let t = ((x - startX) * (endX - startX) + (y - startY) * (endY - startY)) / l2;
          t = Math.max(0, Math.min(1, t));
          const dist = Math.sqrt((x - (startX + t * (endX - startX))) ** 2 + (y - (startY + t * (endY - startY))) ** 2);
          return dist > 15;
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
      const { x, y } = getRelativeCoords(evt.clientX, evt.clientY);
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
      } else if (selectedTool === "arrow") {
        const newArrow = {
          id,
          type: "arrow",
          points: [x, y, x, y],
          color: currentColor,
          strokeWidth: 4,
        };
        setIsDragging(true);
        setCurrentDrawingElement(newArrow);
      } else if (selectedTool === "text") {
        const newText = {
          id,
          type: "text",
          x: x - 60,
          y: y - 15,
          text: "Double-click to edit text",
          color: currentColor,
          fontSize: 20,
        };
        const newElements = [...elementsRef.current, newText];
        updateElementsAndHistory(newElements);
        setSelectedTool("select");
        setSelectedElementId(id);
        setIsDragging(false);
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

    const evt = e.evt || e;

    if (socketRef?.current?.connected) {
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 40) {
        const { x, y } = getRelativeCoords(evt.clientX, evt.clientY);
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
      setPan({ x: evt.clientX - panStart.x, y: evt.clientY - panStart.y });
      return;
    }

    if (!isDragging) return;

    if (currentDrawingElement) {
      const { x, y } = getRelativeCoords(evt.clientX, evt.clientY);
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
      } else if (updated.type === "arrow") {
        updated.points = [updated.points[0], updated.points[1], x, y];
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
      } else if (el.type === "arrow") {
        const dx = el.points[2] - el.points[0];
        const dy = el.points[3] - el.points[1];
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          setCurrentDrawingElement(null);
          return;
        }
      } else if (el.type === "circle" && el.r < 3) {
        setCurrentDrawingElement(null);
        return;
      }

      const newElements = [...elementsRef.current, el];
      updateElementsAndHistory(newElements);
      setCurrentDrawingElement(null);
    }
  };

  const handleShapeSelect = (e, id) => {
    if (selectedTool !== "select" || isReadOnly || previewSnapshot) return;
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    setSelectedElementId(id);
  };

  const handleDoubleClickSticky = (e, element) => {
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (isReadOnly) return;
    if (element.type === "sticky" || element.type === "text") {
      setEditingStickyId(element.id);
      setEditingStickyText(
        element.text === "Double-click to edit note" || element.text === "Double-click to edit text" ? "" : element.text,
      );
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
    updateElementsAndHistory,
    isSpacePressed,
  };
};
