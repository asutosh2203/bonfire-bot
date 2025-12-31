import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  text: string;
  sender: "user" | "bonfire";
  isIncognito?: boolean;
};

export const MessageBubble = ({ text, sender, isIncognito }: Props) => {
  const isMe = sender === "user";
  const isBonfire = sender === "bonfire";

  return (
    <div
      className={cn(
        "w-fit max-w-[85%] rounded-2xl px-4 py-2 mb-2 shadow-sm text-[15px] leading-relaxed wrap-break-word",

        // My messages: Telegram Blue
        isMe &&
          "bg-linear-to-br from-orange-500 to-red-600 text-white self-end ml-auto rounded-br-md",

        // Bonfire: Dark Slate
        !isMe && "bg-[#182533] text-white self-start mr-auto rounded-bl-md"
      )}
    >
      <div className="flex flex-col">
        {isBonfire && (
          <span className="text-[11px] font-bold text-orange-400 mb-1 tracking-wide uppercase flex items-center gap-1">
            <Flame size={10} fill="currentColor" /> Bonfire
          </span>
        )}

        {/* 👇 MARKDOWN RENDERER */}
        <div
          className={cn(
            "markdown-content",
            isMe ? "text-white" : "text-gray-100"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Style links to be visible but not break the layout
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  className="underline text-blue-300 hover:text-blue-200"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              ),
              // Style lists so they have padding
              ul: ({ node, ...props }) => (
                <ul {...props} className="list-disc ml-4 my-1" />
              ),
              ol: ({ node, ...props }) => (
                <ol {...props} className="list-decimal ml-4 my-1" />
              ),
              // Handle bolding
              strong: ({ node, ...props }) => (
                <strong {...props} className="font-bold text-orange-200/90" />
              ),
            }}
          >
            {text}
          </ReactMarkdown>
        </div>

        {isIncognito && (
          <span className="text-[10px] text-white/50 mt-1 flex items-center gap-1 select-none">
            🙈 Hidden
          </span>
        )}
      </div>
    </div>
  );
};
