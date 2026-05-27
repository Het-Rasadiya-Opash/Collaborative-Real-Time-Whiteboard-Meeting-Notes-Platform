import { BarChart3, Briefcase, Calendar, User } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import apiRequest from "../utils/apiRequest";
import { formatDate } from "../utils/utilities";

const GetBoards = ({ onViewAllBoards }) => {
  const [boards, setBoards] = useState([]);
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await apiRequest.get("/boards");
        console.log(res.data.data);
        setBoards(res.data.data || []);
      } catch (err) {
        console.error("Error fetching boards:", err);
      }
    };
    fetchBoards();
  }, []);

  return (
    <div>
      <section className="mt-12 sm:mt-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-on-surface font-headline-md">
            Recent Boards
          </h3>
          <button
            onClick={() => {
              if (onViewAllBoards) {
                onViewAllBoards();
              } else {
                toast.success(
                  "Select and launch a workspace to manage its active boards!",
                );
              }
            }}
            className="text-primary font-bold text-xs hover:underline cursor-pointer"
          >
            View all boards
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {boards.map((board) => (
            <div
              key={board._id}
              onClick={() =>
                toast.success("Launch a workspace to open the board!")
              }
              className="glass-card p-4 rounded-xl flex flex-col justify-between cursor-pointer hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-300 min-h-[140px]"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
                  <BarChart3 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-bold text-sm text-on-surface truncate"
                    title={board.title}
                  >
                    {board.title}
                  </p>
                  {board.workspace?.name && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-primary/80 font-semibold bg-brand-50/50 border border-brand-100/30 px-2 py-0.5 rounded-md w-fit max-w-full">
                      <Briefcase size={10} className="shrink-0" />
                      <span className="truncate">{board.workspace.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/40 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-on-surface-variant/80">
                  <div className="flex items-center gap-1 min-w-0">
                    <User size={12} className="text-outline/80 shrink-0" />
                    <span className="truncate font-semibold">
                      {board.owner?.username || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-on-surface-variant/60">
                    <Calendar size={12} className="shrink-0" />
                    <span>{formatDate(board.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default GetBoards;
