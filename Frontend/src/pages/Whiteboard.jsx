import { FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import apiRequest from "../utils/apiRequest";

import NotesPanel from "../components/whiteboard/NotesPanel";
import PresenceLayer from "../components/whiteboard/PresenceLayer";
import WhiteboardCanvas from "../components/whiteboard/WhiteboardCanvas";
import WhiteboardToolbar from "../components/whiteboard/WhiteboardToolbar";
import VideoMeet from "../components/whiteboard/VideoMeet";

import { ShareModal } from "../components/whiteboard/ShareModal";
import { SnapshotModal } from "../components/whiteboard/SnapshotModal";
import { TemplatesModal } from "../components/whiteboard/TemplatesModal";
import { WhiteboardHeader } from "../components/whiteboard/WhiteboardHeader";
import { WhiteboardSidebar } from "../components/whiteboard/WhiteboardSidebar";
import { WhiteboardStyles } from "../components/whiteboard/WhiteboardStyles";
import {
  generateSWOTElements,
  generateKanbanElements,
  generateMindmapElements,
  generateRetroElements,
} from "../utils/templatesGenerator";

import { useWhiteboardCanvas } from "../hooks/useWhiteboardCanvas";
import { useWhiteboardSocket } from "../hooks/useWhiteboardSocket";

const COLOR_PALETTE = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Green", hex: "#166534" },
  { name: "Orange", hex: "#b45309" },
  { name: "Red", hex: "#b91c1c" },
];

const Whiteboard = ({
  board,
  onClose,
  workspace,
  isReadOnly: propIsReadOnly,
  publicShareToken,
}) => {
  const { currentUser } = useSelector((state) => state.users);

  const myMember = workspace?.members?.find(
    (m) =>
      currentUser?._id &&
      String(m.user?._id || m.user) === String(currentUser?._id),
  );
  const myRole =
    currentUser?._id &&
    (String(workspace?.owner?._id || workspace?.owner) === String(currentUser?._id) ||
      String(board?.owner?._id || board?.owner) === String(currentUser?._id))
      ? "OWNER"
      : myMember?.role || "VIEWER";
  const isReadOnly =
    propIsReadOnly !== undefined ? propIsReadOnly : myRole === "VIEWER";

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareExpiry, setShareExpiry] = useState("24");
  const [shareRole, setShareRole] = useState("VIEWER");
  const [activeShareToken, setActiveShareToken] = useState(
    board.publicShareToken || "",
  );
  const [activeShareExpires, setActiveShareExpires] = useState(
    board.publicShareExpires || null,
  );
  const [activeShareRole, setActiveShareRole] = useState(
    board.publicShareRole || "VIEWER",
  );
  const [isPublicLinkActive, setIsPublicLinkActive] = useState(
    board.isPublic || false,
  );
  const [selectedTool, setSelectedTool] = useState("pencil");
  const [currentColor, setCurrentColor] = useState("#2563eb");
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [selectedElementIds, setSelectedElementIds] = useState([]);

  const [zoom, setZoom] = useState(85);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  const [activeRightTab, setActiveRightTab] = useState("notes");
  const [previewSnapshot, setPreviewSnapshot] = useState(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const canvasRef = useRef(null);
  const editorRef = useRef(null);
  const transformerRef = useRef(null);
  const isCanvasBusyRef = useRef(false);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        setDimensions({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const {
    boardTitle,
    setBoardTitle,
    elements,
    setElements,
    agendaText,
    setAgendaText,
    comments,
    setComments,
    collaborators,
    isSocketConnected,
    saveStatus,
    snapshots,
    fetchSnapshots,
    triggerAutoSave,
    forceSaveCanvas,
    handleSaveNotes,
    handleNotesTyping,
    handleNotesBlur,
    socketRef,
    ydocRef,
    canvasMapRef,
    lastCursorEmitRef,
  } = useWhiteboardSocket({
    board,
    currentUser,
    publicShareToken,
    isReadOnly,
    isEditingTitle,
    isCanvasBusyRef,
    editorRef,
  });

  const {
    isDragging,
    currentDrawingElement,
    editingStickyId,
    editingStickyText,
    setEditingStickyText,
    history,
    redoStack,
    handleStageMouseDown,
    handleStageMouseMove,
    handleStageMouseUp,
    handleShapeSelect,
    handleDoubleClickSticky,
    finishStickyEditing,
    handleDeleteSelected,
    handleClearCanvas,
    handleAlign,
    handleUndo,
    handleRedo,
    handleImageUpload,
    pan,
    setPan,
    isPanning,
    updateElementsAndHistory,
    isSpacePressed,
  } = useWhiteboardCanvas({
    elements,
    setElements,
    selectedTool,
    setSelectedTool,
    currentColor,
    selectedElementId,
    setSelectedElementId,
    selectedElementIds,
    setSelectedElementIds,
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
  });

  const handleApplyTemplate = (templateId, isAppend) => {
    let templateElements = [];
    if (templateId === "swot") {
      templateElements = generateSWOTElements();
    } else if (templateId === "kanban") {
      templateElements = generateKanbanElements();
    } else if (templateId === "mindmap") {
      templateElements = generateMindmapElements();
    } else if (templateId === "retro") {
      templateElements = generateRetroElements();
    }

    const newElements = isAppend
      ? [...elements, ...templateElements]
      : templateElements;

    updateElementsAndHistory(newElements);
  };

  useEffect(() => {
    isCanvasBusyRef.current =
      isDragging ||
      currentDrawingElement !== null ||
      editingStickyId !== null ||
      isPanning;
  }, [isDragging, currentDrawingElement, editingStickyId, isPanning]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("selection-change", {
        boardId: board._id,
        userId: currentUser?._id || `guest_${socketRef.current.id}`,
        selectedElementId,
      });
    }
  }, [selectedElementId, board._id, currentUser]);

  const handleCreateSnapshot = (e) => {
    e.preventDefault();
    if (isCreatingSnapshot) return;
    setIsCreatingSnapshot(true);
    apiRequest
      .post(`/boards/${board._id}/snapshots`, { label: snapshotLabel.trim() })
      .then((response) => {
        const newSnap = response.data?.data;
        if (newSnap) {
          fetchSnapshots();
        }
        setIsSnapshotModalOpen(false);
        setSnapshotLabel("");
      })
      .catch(() => {
        toast.error("Failed to create snapshot");
      })
      .finally(() => {
        setIsCreatingSnapshot(false);
      });
  };

  const handleRestoreSnapshot = (snap) => {
    if (isReadOnly) return;
    if (
      window.confirm(
        `Are you sure you want to restore the whiteboard to "${snap.label || "this version"}"? This will modify the board for all active users.`,
      )
    ) {
      apiRequest
        .post(
          `/boards/${board._id}/snapshots/${snap._id}/restore`,
          {},
          { skipSuccessToast: true },
        )
        .then(() => {
          setElements(snap.canvasJson || []);
          setPreviewSnapshot(null);
          fetchSnapshots();
        })
        .catch(() => {
          toast.error("Failed to restore board");
        });
    }
  };

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (!boardTitle.trim() || boardTitle.trim() === board.title) {
      return;
    }

    apiRequest
      .put(`/boards/${board._id}`, { title: boardTitle.trim() })
      .then(() => {})
      .catch(() => {
        setBoardTitle(board.title);
      });
  };

  const handleGenerateShareLink = async () => {
    try {
      const response = await apiRequest.post(
        `/boards/${board._id}/share-link`,
        {
          expiresIn: Number(shareExpiry),
          role: shareRole,
        },
        {
          skipSuccessToast: true,
        },
      );

      const data = response.data?.data;
      if (data) {
        setActiveShareToken(data.shareToken);
        setActiveShareExpires(data.expiresAt);
        setActiveShareRole(data.publicShareRole);
        setIsPublicLinkActive(true);

        const frontendShareUrl = `${window.location.protocol}//${window.location.host}/board/shared/${data.shareToken}`;
        await navigator.clipboard.writeText(frontendShareUrl);
        toast.success("Share link generated and copied to clipboard!");
      }
    } catch {
      toast.error("Failed to generate share link");
    }
  };

  const handleRevokeShareLink = async () => {
    try {
      await apiRequest.post(
        `/boards/${board._id}/revoke-share`,
        {},
        {
          skipSuccessToast: true,
        },
      );
      setIsPublicLinkActive(false);
      setActiveShareToken("");
      setActiveShareExpires(null);
      toast.success("Public share link revoked successfully");
    } catch {
      toast.error("Failed to revoke share link");
    }
  };

  const handleExportPNG = async () => {
    if (saveStatus !== "saved") {
      try {
        await forceSaveCanvas(elements);
      } catch (err) {
        console.warn("Failed to auto-save before export:", err);
      }
    }
    const loadingToast = toast.loading("Generating board PNG on the server...");
    try {
      const response = await apiRequest.get(`/boards/${board._id}/export/png`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "image/png" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${boardTitle.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("Board exported as PNG successfully!");
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error("Failed to export board as PNG.");
    }
  };

  const handleExportPDF = async () => {
    if (saveStatus !== "saved") {
      try {
        await forceSaveCanvas(elements);
      } catch (err) {
        console.warn("Failed to auto-save before export:", err);
      }
    }
    const loadingToast = toast.loading(
      "Generating meeting summary PDF on the server...",
    );
    try {
      const response = await apiRequest.get(`/boards/${board._id}/export/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${boardTitle.replace(/\s+/g, "_")}_meeting_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("Meeting summary exported as PDF successfully!");
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error("Failed to export meeting summary as PDF.");
    }
  };

  const handleFormatCommand = (command, value = null) => {
    if (isReadOnly) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setAgendaText(html);
      handleSaveNotes(html);
    }
  };

  const toggleNotes = () => {
    setIsNotesOpen(!isNotesOpen);
  };

  const displayedElements = previewSnapshot
    ? previewSnapshot.canvasJson || []
    : elements;

  const typingCollaborators = collaborators.filter(
    (c) => c.isTypingNotes && c.userId !== currentUser?._id,
  );

  return (
    <div className="fixed inset-0 w-full h-full flex z-50 bg-background text-on-background font-sans overflow-hidden select-none animate-in fade-in duration-200 whiteboard-root">
      <WhiteboardStyles />

      <WhiteboardSidebar
        onClose={onClose}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-45 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main
        className={`flex-1 flex flex-col relative overflow-hidden transition-all duration-300 ${isSidebarOpen ? "lg:ml-[280px]" : "ml-0"}`}
      >
        <WhiteboardHeader
          isEditingTitle={isEditingTitle}
          boardTitle={boardTitle}
          setBoardTitle={setBoardTitle}
          handleSaveTitle={handleSaveTitle}
          setIsEditingTitle={setIsEditingTitle}
          isReadOnly={isReadOnly}
          workspace={workspace}
          saveStatus={saveStatus}
          publicShareToken={publicShareToken}
          setIsShareModalOpen={setIsShareModalOpen}
          isExportDropdownOpen={isExportDropdownOpen}
          setIsExportDropdownOpen={setIsExportDropdownOpen}
          handleExportPNG={handleExportPNG}
          handleExportPDF={handleExportPDF}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isVideoCallActive={isVideoCallActive}
          setIsVideoCallActive={setIsVideoCallActive}
        />

        <div className="mt-14 flex-1 bg-surface-bright relative canvas-dot-grid overflow-hidden flex">
          <div className="flex-1 relative cursor-crosshair">
            {previewSnapshot && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 text-white font-sans px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-6 animate-in slide-in-from-top duration-300 backdrop-blur-md border border-amber-400/40">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined animate-pulse">
                    schedule
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">
                      Previewing Past Version
                    </span>
                    <span className="text-sm font-black truncate max-w-[280px]">
                      {previewSnapshot.label ||
                        `Version - ${new Date(previewSnapshot.createdAt || previewSnapshot.version).toLocaleString()}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRestoreSnapshot(previewSnapshot)}
                      className="bg-white text-amber-700 hover:bg-amber-50 transition-all font-bold text-xs px-4 py-2 rounded-xl active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm border border-amber-200"
                    >
                      <span className="material-symbols-outlined text-[16px] font-bold">
                        restore
                      </span>
                      Restore This Version
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewSnapshot(null)}
                    className="bg-white/10 hover:bg-white/20 transition-all font-bold text-xs px-4 py-2 rounded-xl active:scale-95 cursor-pointer flex items-center gap-1.5 border border-white/20"
                  >
                    Exit Preview
                  </button>
                </div>
              </div>
            )}
            <WhiteboardToolbar
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              setSelectedElementId={setSelectedElementId}
              currentColor={currentColor}
              setCurrentColor={setCurrentColor}
              colorPalette={COLOR_PALETTE}
              selectedElementId={selectedElementId}
              selectedElementIds={selectedElementIds}
              handleDeleteSelected={handleDeleteSelected}
              handleClearCanvas={handleClearCanvas}
              handleAlign={handleAlign}
              handleImageUpload={handleImageUpload}
              isReadOnly={isReadOnly}
              onOpenTemplates={() => setIsTemplatesModalOpen(true)}
            />

            <WhiteboardCanvas
              canvasRef={canvasRef}
              zoom={zoom}
              setZoom={setZoom}
              pan={pan}
              isReadOnly={isReadOnly}
              selectedTool={selectedTool}
              selectedElementId={selectedElementId}
              selectedElementIds={selectedElementIds}
              handleImageUpload={handleImageUpload}
              displayedElements={displayedElements}
              currentDrawingElement={currentDrawingElement}
              editingStickyId={editingStickyId}
              editingStickyText={editingStickyText}
              setEditingStickyText={setEditingStickyText}
              handleStageMouseDown={handleStageMouseDown}
              handleStageMouseMove={handleStageMouseMove}
              handleStageMouseUp={handleStageMouseUp}
              handleShapeSelect={handleShapeSelect}
              handleDoubleClickSticky={handleDoubleClickSticky}
              finishStickyEditing={finishStickyEditing}
              handleUndo={handleUndo}
              handleRedo={handleRedo}
              historyCount={history.length}
              redoCount={redoStack.length}
              setPan={setPan}
              isPanning={isPanning}
              isSpacePressed={isSpacePressed}
              updateElementsAndHistory={updateElementsAndHistory}
              collaborators={collaborators}
              currentUser={currentUser}
            />

            <PresenceLayer
              collaborators={collaborators}
              currentUser={currentUser}
              zoom={zoom}
              pan={pan}
            />
          </div>

          {currentUser && isVideoCallActive && (
            <VideoMeet
              boardId={board._id}
              currentUser={currentUser}
              socketRef={socketRef}
              isSidebarOpen={isSidebarOpen}
              onLeave={() => setIsVideoCallActive(false)}
            />
          )}

          <NotesPanel
            isNotesOpen={isNotesOpen}
            toggleNotes={toggleNotes}
            activeRightTab={activeRightTab}
            setActiveRightTab={setActiveRightTab}
            fetchSnapshots={fetchSnapshots}
            workspace={workspace}
            currentUser={currentUser}
            collaborators={collaborators}
            isReadOnly={isReadOnly}
            editorRef={editorRef}
            agendaText={agendaText}
            setAgendaText={setAgendaText}
            handleSaveNotes={handleSaveNotes}
            handleNotesBlur={handleNotesBlur}
            handleNotesTyping={handleNotesTyping}
            handleFormatCommand={handleFormatCommand}
            typingCollaborators={typingCollaborators}
            comments={comments}
            newComment={newComment}
            setNewComment={setNewComment}
            socketRef={socketRef}
            board={board}
            setComments={setComments}
            snapshots={snapshots}
            setIsSnapshotModalOpen={setIsSnapshotModalOpen}
            previewSnapshot={previewSnapshot}
            setPreviewSnapshot={setPreviewSnapshot}
            handleRestoreSnapshot={handleRestoreSnapshot}
            handleExportPNG={handleExportPNG}
            handleExportPDF={handleExportPDF}
          />

          {!isNotesOpen && (
            <button
              onClick={toggleNotes}
              className="absolute right-6 top-6 glass-card border border-outline-variant rounded-xl p-3 shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary z-30 transition-all active:scale-95 cursor-pointer"
              title="Open Meeting Notes"
            >
              <FileText size={18} />
            </button>
          )}
        </div>
      </main>

      {isSnapshotModalOpen && (
        <SnapshotModal
          snapshotLabel={snapshotLabel}
          setSnapshotLabel={setSnapshotLabel}
          isCreatingSnapshot={isCreatingSnapshot}
          handleCreateSnapshot={handleCreateSnapshot}
          setIsSnapshotModalOpen={setIsSnapshotModalOpen}
        />
      )}

      {isShareModalOpen && (
        <ShareModal
          isPublicLinkActive={isPublicLinkActive}
          activeShareRole={activeShareRole}
          activeShareToken={activeShareToken}
          activeShareExpires={activeShareExpires}
          shareExpiry={shareExpiry}
          setShareExpiry={setShareExpiry}
          shareRole={shareRole}
          setShareRole={setShareRole}
          handleGenerateShareLink={handleGenerateShareLink}
          handleRevokeShareLink={handleRevokeShareLink}
          setIsShareModalOpen={setIsShareModalOpen}
        />
      )}

      {isTemplatesModalOpen && (
        <TemplatesModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          onApplyTemplate={handleApplyTemplate}
        />
      )}
    </div>
  );
};

export default Whiteboard;
