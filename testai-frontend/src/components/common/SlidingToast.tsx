import React, { useEffect } from "react";

interface Props {
  message: string;
  onClose: () => void;
}

const SlidingToast: React.FC<Props> = ({ message, onClose }) => {
  useEffect(() => {
    const t = setTimeout(() => onClose(), 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={styles.container} role="status" aria-live="polite">
      <div style={styles.toast}>
        <div style={styles.message}>{message}</div>
        <button aria-label="close" onClick={onClose} style={styles.close}>
          ✕
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    right: 12,
    bottom: 12,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  toast: {
    minWidth: 320,
    maxWidth: 420,
    background: "#0b5cff",
    color: "white",
    padding: "14px 18px",
    borderRadius: 10,
    boxShadow: "0 8px 22px rgba(11,92,255,0.30)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    transform: "translateX(0)",
    transition: "transform 300ms ease, opacity 300ms ease",
  },
  message: { fontSize: 15 },
  close: {
    marginLeft: 12,
    border: "none",
    background: "transparent",
    color: "white",
    fontSize: 18,
    cursor: "pointer",
  },
};

export default SlidingToast;
