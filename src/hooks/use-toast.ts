"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive";

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  variant?: ToastVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type State = { toasts: ToasterToast[] };

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 4000;

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: { type: "ADD" | "DISMISS" | "REMOVE"; toast?: ToasterToast; toastId?: string }) {
  switch (action.type) {
    case "ADD":
      memoryState = { toasts: [action.toast!, ...memoryState.toasts].slice(0, TOAST_LIMIT) };
      break;
    case "DISMISS":
      memoryState = {
        toasts: memoryState.toasts.map((t) =>
          t.id === action.toastId || !action.toastId ? { ...t, open: false } : t
        ),
      };
      setTimeout(() => dispatch({ type: "REMOVE", toastId: action.toastId }), TOAST_REMOVE_DELAY);
      break;
    case "REMOVE":
      memoryState = {
        toasts: action.toastId
          ? memoryState.toasts.filter((t) => t.id !== action.toastId)
          : [],
      };
      break;
  }
  listeners.forEach((l) => l(memoryState));
}

export function toast(props: Omit<ToasterToast, "id">) {
  const id = genId();
  const dismiss = () => dispatch({ type: "DISMISS", toastId: id });
  dispatch({
    type: "ADD",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => { if (!open) dismiss(); },
    },
  });
  return { id, dismiss };
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS", toastId }),
  };
}
