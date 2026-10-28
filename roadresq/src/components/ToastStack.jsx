import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2, X } from "lucide-react";
import { selectNotifications, dismissNotification } from "../store/notificationsSlice";

function Toast({ id, message, tone }) {
  const dispatch = useDispatch();

  // useEffect + Redux together: each toast schedules its own removal
  // by dispatching an action after a timeout, cleaned up if it's
  // dismissed early or unmounts for any other reason
  useEffect(() => {
    const id2 = setTimeout(() => dispatch(dismissNotification(id)), 3200);
    return () => clearTimeout(id2);
  }, [id, dispatch]);

  return (
    <div
      className={`flex items-center gap-2 rounded-sm border px-4 py-3 font-mono text-xs shadow-lg backdrop-blur ${
        tone === "success"
          ? "border-signal/40 bg-ink text-signal"
          : "border-ink-line bg-ink text-paper"
      }`}
    >
      <CheckCircle2 size={14} className={tone === "success" ? "text-signal" : "text-amber"} />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => dispatch(dismissNotification(id))}
        aria-label="Dismiss"
        className="text-paper/40 hover:text-paper"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function ToastStack() {
  // useSelector — reads the same queue no matter which component dispatched to it
  const notifications = useSelector(selectNotifications);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex w-72 flex-col gap-2">
      {notifications.map((n) => (
        <Toast key={n.id} {...n} />
      ))}
    </div>
  );
}
