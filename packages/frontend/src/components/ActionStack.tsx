import { Heart, MessageCircle, Share2, VolumeX, Plus } from "lucide-react";
import type { PerformerData } from "@/services/api";
import { tracker } from "@/services/tracker";

interface ActionStackProps {
  performer: PerformerData;
  liked: boolean;
  onLike: () => void;
  onSound: () => void;
  onProfile: () => void;
}

const ActionStack = ({ performer, liked, onLike, onSound, onProfile }: ActionStackProps) => {
  const handleShare = async () => {
    const shareData = {
      title: `${performer.username} is live on xcam.vip`,
      url: performer.room_url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        tracker.track("share_clicked", { performer_id: performer.username, share_method: "native" });
      } else {
        await navigator.clipboard.writeText(performer.room_url);
        tracker.track("share_clicked", { performer_id: performer.username, share_method: "clipboard" });
      }
    } catch { /* user cancelled share dialog */ }
  };

  const handleChat = () => {
    window.open(performer.room_url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Avatar — performer thumbnail */}
      <button onClick={onProfile} className="relative btn-press" aria-label="View profile">
        <div className="w-12 h-12 rounded-full border-2 border-foreground/30 overflow-hidden bg-card">
          <img
            src={performer.image_url}
            alt={performer.username}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Plus size={12} strokeWidth={3} />
        </div>
      </button>

      {/* Heart */}
      <button onClick={onLike} className="btn-press flex flex-col items-center gap-1" aria-label={liked ? "Unlike" : "Like"}>
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <Heart
            size={24}
            className={liked ? "fill-primary text-primary" : "text-foreground"}
            strokeWidth={1.5}
          />
        </div>
        <span className="text-[10px] text-foreground text-overlay tabular-nums font-medium">
          {performer.num_users > 1000 ? `${(performer.num_users / 1000).toFixed(1)}K` : performer.num_users}
        </span>
      </button>

      {/* Chat — opens performer's room */}
      <button onClick={handleChat} className="btn-press flex flex-col items-center gap-1" aria-label="Open chat">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <MessageCircle size={24} className="text-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] text-foreground text-overlay font-medium">Chat</span>
      </button>

      {/* Share */}
      <button onClick={handleShare} className="btn-press flex flex-col items-center gap-1" aria-label="Share">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <Share2 size={24} className="text-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] text-foreground text-overlay font-medium">Share</span>
      </button>

      {/* Sound — opens prompt to visit room */}
      <button onClick={onSound} className="btn-press flex flex-col items-center gap-1" aria-label="Sound">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <VolumeX size={24} className="text-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] text-foreground text-overlay font-medium">Sound</span>
      </button>
    </div>
  );
};

export default ActionStack;
