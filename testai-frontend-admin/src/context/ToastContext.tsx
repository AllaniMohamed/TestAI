import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import SlidingToast from "../components/common/SlidingToast";

interface ToastContextType {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { message?: string } | undefined;
      const message = detail?.message || "Feature is temporarily unavailable";
      addToast(message);
    };

    window.addEventListener("ui-toast", handler as EventListener);
    return () => window.removeEventListener("ui-toast", handler as EventListener);
  }, []);

  const addToast = useCallback((message: string) => {
    setToasts((prev) => [...prev, { id: Date.now(), message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string) => addToast(message), [addToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render toasts */}
      <div>
        {toasts.map((t) => (
          <SlidingToast key={t.id} message={t.message} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
