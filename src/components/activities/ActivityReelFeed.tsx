import { useRef, useState, useEffect } from "react";
import ActivityReelCard, { type ActivityItem } from "./ActivityReelCard";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Props {
  activities: ActivityItem[];
}

export default function ActivityReelFeed({ activities }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setCurrentIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activities]);

  const scrollTo = (dir: "up" | "down") => {
    const container = containerRef.current;
    if (!container) return;
    const nextIdx = dir === "up" ? Math.max(0, currentIndex - 1) : Math.min(activities.length - 1, currentIndex + 1);
    const target = container.querySelector(`[data-index="${nextIdx}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (activities.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No activities to show
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-foreground/95 rounded-2xl overflow-hidden">
      {/* Scrollable reel container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {activities.map((item, idx) => (
          <div key={item.id} data-index={idx} className="h-full w-full snap-start snap-always">
            <ActivityReelCard item={item} />
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
        {activities.slice(0, 20).map((_, idx) => (
          <div
            key={idx}
            className={`w-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "h-5 bg-white" : "h-1.5 bg-white/30"
            }`}
          />
        ))}
      </div>

      {/* Navigation arrows (desktop) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden sm:flex gap-2 z-20">
        <button
          onClick={() => scrollTo("up")}
          disabled={currentIndex === 0}
          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/30 transition-colors"
        >
          <ChevronUp size={18} />
        </button>
        <span className="text-white/60 text-xs self-center font-medium tabular-nums">
          {currentIndex + 1} / {activities.length}
        </span>
        <button
          onClick={() => scrollTo("down")}
          disabled={currentIndex === activities.length - 1}
          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/30 transition-colors"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Swipe hint (mobile only) */}
      {currentIndex === 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 sm:hidden animate-bounce z-20">
          <div className="flex flex-col items-center gap-1 text-white/50">
            <ChevronUp size={20} />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Swipe up</span>
          </div>
        </div>
      )}
    </div>
  );
}
