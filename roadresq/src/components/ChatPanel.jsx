import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import api from "../lib/api";
import { useSocket } from "../context/SocketContext";
import useSocketEvent from "../hooks/useSocketEvent";

/**
 * EXPERIMENT 8 — real-time chat between customer and mechanic.
 * History is loaded over REST (so a refresh keeps the conversation);
 * new messages arrive via the `chat:message` socket event and are sent
 * with an acknowledgement callback so server-side rejections (closed
 * request, not a participant) surface as an error line.
 */
export default function ChatPanel({ requestId, myId, closed = false, onClose, title = "Chat" }) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // load history whenever we open a different request
  useEffect(() => {
    let cancelled = false;
    api
      .listMessages(requestId)
      .then((history) => !cancelled && setMessages(history))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useSocketEvent("chat:message", (msg) => {
    if (msg.requestId !== requestId) return;
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function send(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !socket || sending) return;
    setSending(true);
    setError(null);
    socket.emit("chat:message", { requestId, text: trimmed }, (res) => {
      setSending(false);
      if (res?.ok) setText("");
      else setError(res?.error || "Message failed to send");
    });
  }

  return (
    <div className="flex h-80 flex-col rounded-md border border-ink/10 bg-white/70" aria-label="Chat">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          {title}
          <span className={`ml-2 ${connected ? "text-signal" : "text-flare"}`}>
            ● {connected ? "live" : "reconnecting"}
          </span>
        </p>
        {onClose && (
          <button onClick={onClose} aria-label="Close chat" className="text-ink/40 hover:text-ink">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3" role="log">
        {messages.length === 0 && (
          <p className="pt-6 text-center font-body text-sm text-ink/40">
            No messages yet — say hello and share any details that help.
          </p>
        )}
        {messages.map((m) => {
          const mine = String(m.from) === String(myId);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[80%] rounded-md px-3 py-2 font-body text-sm ${
                  mine ? "bg-ink text-paper" : "bg-ink/5 text-ink"
                }`}
              >
                {m.text}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 font-body text-xs text-flare">{error}</p>}

      {closed ? (
        <p className="border-t border-ink/10 px-4 py-3 text-center font-body text-xs text-ink/40">
          This request is closed — chat is read-only.
        </p>
      ) : (
        <form onSubmit={send} className="flex gap-2 border-t border-ink/10 p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Type a message…"
            aria-label="Message"
            className="flex-1 rounded-sm border border-ink/15 bg-white px-3 py-2 font-body text-sm text-ink placeholder:text-ink/30"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending || !connected}
            aria-label="Send message"
            className="flex items-center gap-1.5 rounded-sm bg-flare px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-paper disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
}
