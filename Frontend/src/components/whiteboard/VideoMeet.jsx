import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

// Config for WebRTC (using free public Google STUN servers)
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

const VideoMeet = ({ boardId, currentUser, socketRef, isSidebarOpen, onLeave }) => {
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remotePeers, setRemotePeers] = useState({}); // socketId -> { stream, username }
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const localVideoRef = useRef(null);
  const peerConnections = useRef({}); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const didStartCall = useRef(false);
  const isMountedRef = useRef(true);

  // Stop media stream tracks
  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  };

  // Start video call
  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setInCall(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Join the video call channel
      if (socketRef.current) {
        socketRef.current.emit("join-video", {
          boardId,
          userId: currentUser._id,
          username: currentUser.username,
        });
      }
    } catch (err) {
      console.error("Failed to access media devices:", err);
      toast.error("Could not access camera or microphone. Please check permissions.");
      if (onLeave) onLeave();
    }
  };

  useEffect(() => {
    if (didStartCall.current) return;
    didStartCall.current = true;
    startCall();
  }, []);

  // Leave video call
  const leaveCall = () => {
    // Notify server
    if (socketRef.current) {
      socketRef.current.emit("leave-video");
    }

    // Close all Peer Connections
    Object.keys(peerConnections.current).forEach((socketId) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
      }
    });
    peerConnections.current = {};

    // Stop streams
    stopLocalStream();
    setRemotePeers({});
    setInCall(false);
    toast.success("Disconnected from video call");
    if (onLeave) onLeave();
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Setup Peer Connection helper
  const createPeerConnection = (targetSocketId, targetUsername, isInitiator) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks to PC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // On ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("video-signal", {
          targetSocketId,
          signalData: { candidate: event.candidate },
        });
      }
    };

    // On Remote Track
    pc.ontrack = (event) => {
      setRemotePeers((prev) => ({
        ...prev,
        [targetSocketId]: {
          stream: event.streams[0],
          username: targetUsername,
        },
      }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        closePeer(targetSocketId);
      }
    };

    peerConnections.current[targetSocketId] = pc;
    return pc;
  };

  const closePeer = (socketId) => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close();
      delete peerConnections.current[socketId];
    }
    setRemotePeers((prev) => {
      const updated = { ...prev };
      delete updated[socketId];
      return updated;
    });
  };

  useEffect(() => {
    if (!socketRef || !socketRef.current || !inCall) return;
    const socket = socketRef.current;

    // 1. Receives list of active users in the call
    socket.on("video-users-list", async (users) => {
      for (const u of users) {
        // We create peer connection and send offer
        const pc = createPeerConnection(u.socketId, u.username, true);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("video-signal", {
            targetSocketId: u.socketId,
            signalData: { sdp: pc.localDescription },
          });
        } catch (err) {
          console.error("Failed to create offer:", err);
        }
      }
    });

    // 2. Another user joined
    socket.on("video-user-joined", ({ socketId, username }) => {
      // We will wait for them to send an offer
      console.log(`Video call peer joined: ${username}`);
    });

    // 3. Receive signals (SDP offer/answer or ICE candidate)
    socket.on("video-signal", async ({ senderSocketId, senderUsername, signalData }) => {
      let pc = peerConnections.current[senderSocketId];

      if (!pc) {
        pc = createPeerConnection(senderSocketId, senderUsername, false);
      }

      if (signalData.sdp) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          if (signalData.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("video-signal", {
              targetSocketId: senderSocketId,
              signalData: { sdp: pc.localDescription },
            });
          }
        } catch (err) {
          console.error("Failed to handle SDP signal:", err);
        }
      } else if (signalData.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        } catch (err) {
          console.error("Failed to add ICE candidate:", err);
        }
      }
    });

    // 4. Remote user left call
    socket.on("video-user-left", ({ socketId, username }) => {
      closePeer(socketId);
      toast(`${username} left the video call`);
    });

    return () => {
      socket.off("video-users-list");
      socket.off("video-user-joined");
      socket.off("video-signal");
      socket.off("video-user-left");
    };
  }, [inCall, socketRef]);

  // Handle cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      Object.keys(peerConnections.current).forEach((socketId) => {
        if (peerConnections.current[socketId]) {
          peerConnections.current[socketId].close();
        }
      });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (!inCall) return null;

  return (
    <div
      className={`fixed bottom-6 ${isSidebarOpen ? "left-[304px]" : "left-6"} z-40 transition-all duration-300 flex flex-col items-start gap-4`}
    >
      <div className="glass-card p-4 rounded-2xl shadow-2xl flex flex-col gap-3 max-w-[320px] sm:max-w-[400px] border border-outline-variant/60 bg-surface/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="flex justify-between items-center pb-2 border-b border-outline-variant/40">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
            Live Meeting call
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold">
            {Object.keys(remotePeers).length + 1} online
          </span>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto custom-scrollbar p-1">
          {/* Local Stream Video */}
          <div className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden border border-outline-variant/40 shadow-inner group">
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localStream) {
                  el.srcObject = localStream;
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2 opacity-100 transition-opacity">
              <span className="text-[9px] font-bold text-white truncate">
                You ({currentUser.username})
              </span>
            </div>
            {!videoEnabled && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs uppercase">
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Remote Peer Videos */}
          {Object.keys(remotePeers).map((socketId) => {
            const peer = remotePeers[socketId];
            return (
              <div
                key={socketId}
                className="relative aspect-video rounded-xl bg-slate-900 overflow-hidden border border-outline-variant/40 shadow-inner group"
              >
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el && peer.stream) {
                      el.srcObject = peer.stream;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[9px] font-bold text-white truncate">
                    {peer.username}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls Panel */}
        <div className="flex justify-center items-center gap-3 pt-2 border-t border-outline-variant/40">
          {/* Microphone Toggle */}
          <button
            onClick={toggleMic}
            className={`p-2.5 rounded-full shadow transition-all cursor-pointer ${
              micEnabled
                ? "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                : "bg-error/15 text-error hover:bg-error/20"
            }`}
          >
            {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-2.5 rounded-full shadow transition-all cursor-pointer ${
              videoEnabled
                ? "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
                : "bg-error/15 text-error hover:bg-error/20"
            }`}
          >
            {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
          </button>

          {/* Leave Button */}
          <button
            onClick={leaveCall}
            className="p-2.5 rounded-full bg-error hover:bg-red-700 text-white shadow transition-all cursor-pointer"
            title="Leave Video Call"
          >
            <PhoneOff size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoMeet;
