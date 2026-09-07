import { useEffect } from "react";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.type}`} role="status">
      <span className="toast__mark">{toast.type === "error" ? "!" : "\u2713"}</span>
      <span>{toast.message}</span>
    </div>
  );
}
