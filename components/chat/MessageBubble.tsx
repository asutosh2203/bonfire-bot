import { cn } from "@/lib/utils";

type MessageProps = {
  text: string;
  sender: "user" | "friend" | "bonfire";
  isIncognito?: boolean;
};

export const MessageBubble = ({ text, sender, isIncognito }: MessageProps) => {
  const isMe = sender === "user";
  const isBonfire = sender === "bonfire";

  return (
    <div
      className={cn(
        "w-fit max-w-[50%] rounded-2xl px-4 py-2 mb-5 shadow-sm text-[15px] leading-relaxed",
        // My messages: Orange/ Red gradient
        isMe &&
          "bg-linear-to-br from-orange-400 to-red-500 text-white self-end ml-auto rounded-br-md",

        // Bonfire/Others: Dark Slate
        !isMe && "bg-[#182533] text-white self-start mr-auto rounded-bl-md"

        // Bonfire specific: Add a subtle border or glow if you want, but keep it minimal
        // isBonfire && "border border-orange-500/20"
      )}
    >
      <div className="flex flex-col">
        {isBonfire && (
          <span className="text-[11px] font-bold text-orange-400 mb-1 tracking-wide uppercase">
            Bonfire
          </span>
        )}

        <p>{text}</p>

        {isIncognito && (
          <span className="text-[10px] text-white/50 mt-1 flex items-center gap-1">
            🙊 Hidden
          </span>
        )}
      </div>
    </div>
  );
};
