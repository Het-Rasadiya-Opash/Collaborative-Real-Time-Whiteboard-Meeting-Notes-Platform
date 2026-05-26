import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import apiRequest from "../utils/apiRequest";
import Whiteboard from "./Whiteboard";
import { Loader2, AlertCircle, Home, Clock } from "lucide-react";

const PublicBoard = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [boardData, setBoardData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPublicBoard = async () => {
      try {
        setLoading(true);
        const response = await apiRequest.get(`/boards/share/${token}`, {
          skipToast: true,
        });
        if (isMounted) {
          setBoardData(response.data?.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "This shared link is invalid or has expired.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (token) {
      fetchPublicBoard();
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-100 font-sans z-50">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-wide">
              Loading Shared Whiteboard
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Fetching live collaborative workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans z-50 px-4">
        <div className="max-w-md w-full text-center glass-card border border-rose-500/20 bg-rose-950/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-250">
          <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-rose-500">
              Link Inactive or Expired
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {error ||
                "This shared board access link is no longer valid, has reached its expiration time, or was revoked by the workspace owner."}
            </p>
          </div>

          <div className="flex flex-col gap-3.5 w-full pt-4 border-t border-slate-800/40">
            <div className="flex items-center gap-2 justify-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <Clock size={12} />
              <span>Expires automatically after chosen limit</span>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all active:scale-95 shadow-lg cursor-pointer"
            >
              <Home size={14} />
              Go to Workspace Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Whiteboard
      board={boardData.board}
      isReadOnly={boardData.isReadOnly}
      publicShareToken={token}
      onClose={() => navigate("/")}
    />
  );
};

export default PublicBoard;
