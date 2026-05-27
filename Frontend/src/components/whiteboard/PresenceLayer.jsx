import React from "react";

const PresenceLayer = ({ collaborators, currentUser, zoom, pan = { x: 0, y: 0 } }) => {
  const cursorColors = ["#7c3aed", "#166534", "#b45309", "#b91c1c", "#2563eb"];

  return (
    <>
      {collaborators
        .filter((collab) => collab.userId !== currentUser?._id)
        .map((collab, index) => {
          const cursorColor = cursorColors[index % cursorColors.length];
          const scale = zoom / 100;
          const leftPos = collab.cursorX * scale + pan.x;
          const topPos = collab.cursorY * scale + pan.y;

          return (
            <div
              key={collab.userId || index}
              style={{ left: `${leftPos}px`, top: `${topPos}px` }}
              className="absolute cursor-smooth pointer-events-none flex items-center gap-2 z-40"
            >
              <svg
                fill="none"
                height="24"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.65376 12.3822L17.7026 21.6111L14.7735 5.5186L5.65376 12.3822Z"
                  fill={cursorColor}
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap text-white"
                style={{ backgroundColor: cursorColor }}
              >
                {collab.username || "Collaborator"}
                {collab.isTyping ? " is typing..." : ""}
              </span>
            </div>
          );
        })}
    </>
  );
};

export default PresenceLayer;
