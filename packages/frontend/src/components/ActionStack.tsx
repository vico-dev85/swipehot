import { Heart, MessageCircle, Share2, VolumeX, Plus } from "lucide-react";
import type { PerformerData } from "@/services/api";
import { tracker } from "@/services/tracker";

interface ActionStackProps {
  performer: PerformerData;
  liked: boolean;
  onLike: () => void;
  onSound: () => void;
  onChat: () => void;
  onFollow: () => void;
}

const ActionStack = ({ performer, liked, onLike, onSound, onChat, onFollow }: ActionStackProps) => {
  const handleShare = async () => {
    const shareUrl = `https://xcam.vip/?ref=${encodeURIComponent(performer.username)}&campaign=roGHG&tour=9oGW&track=social_share`;
    const shareData = {
      title: `Watch ${performer.display_name} live on xcam.vip`,
      text: `${performer.display_name} is streaming live right now on xcam.vip — free cam roulette`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        tracker.track("share_clicked", { performer_id: performer.username, share_method: "native" });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        tracker.track("share_clicked", { performer_id: performer.username, share_method: "clipboard" });
      }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Avatar — performer thumbnail + follow */}
      <button onClick={onFollow} className="relative btn-press" aria-label="Follow">
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

      {/* Chat — soft CTA popup */}
      <button onClick={onChat} className="btn-press flex flex-col items-center gap-1" aria-label="Chat">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <MessageCircle size={24} className="text-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] text-foreground text-overlay font-medium">Chat</span>
      </button>

      {/* Share — shares xcam.vip with performer context */}
      <button onClick={handleShare} className="btn-press flex flex-col items-center gap-1" aria-label="Share">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <Share2 size={24} className="text-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] text-foreground text-overlay font-medium">Share</span>
      </button>

      {/* Sound — soft CTA popup */}
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
