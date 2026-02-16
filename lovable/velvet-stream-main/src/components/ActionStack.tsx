import { Heart, MessageCircle, Share2, Volume2, VolumeX, BadgeCheck, Plus } from "lucide-react";
import { useState } from "react";
import type { Performer } from "@/data/performers";

interface ActionStackProps {
  performer: Performer;
  liked: boolean;
  onLike: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onProfile: () => void;
}

const ActionStack = ({ performer, liked, onLike, muted, onToggleMute, onProfile }: ActionStackProps) => {
  return (
    <div className="flex flex-col items-center gap-5">
      {/* Avatar */}
      <button onClick={onProfile} className="relative btn-press">
        <div className="w-12 h-12 rounded-full bg-card border-2 border-foreground/30 flex items-center justify-center text-xs font-bold text-foreground overflow-hidden">
          {performer.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Plus size={12} strokeWidth={3} />
        </div>
      </button>

      {/* Heart */}
      <button onClick={onLike} className="btn-press flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <Heart
            size={24}
            className={liked ? "fill-primary text-primary" : "text-foreground"}
            strokeWidth={1.5}
          />
        </div>
        <span className="text-[10px] text-foreground text-overlay tabular-nums font-medium">{performer.likes}</span>
      </button>

      {/* Comment */}
      <button className="btn-press flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <MessageCircle size={24} className="text-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] text-foreground text-overlay tabular-nums font-medium">{performer.comments}</span>
      </button>

      {/* Share */}
      <button className="btn-press flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          <Share2 size={24} className="text-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-[10px] text-foreground text-overlay font-medium">Share</span>
      </button>

      {/* Sound */}
      <button onClick={onToggleMute} className="btn-press flex flex-col items-center gap-1">
        <div className="w-11 h-11 rounded-full glass flex items-center justify-center">
          {muted ? (
            <VolumeX size={24} className="text-foreground" strokeWidth={1.5} />
          ) : (
            <Volume2 size={24} className="text-foreground" strokeWidth={1.5} />
          )}
        </div>
        <span className="text-[10px] text-foreground text-overlay font-medium">Sound</span>
      </button>
    </div>
  );
};

export default ActionStack;
