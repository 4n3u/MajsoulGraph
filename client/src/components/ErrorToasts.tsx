import { useCallback, type ReactNode } from "react";
import { Toast } from "@base-ui/react/toast";

const errorToastId = "app-error-toast";
const successToastId = "app-success-toast";

type ErrorToastProviderProps = {
  children: ReactNode;
};

function ErrorToastList() {
  const { toasts } = Toast.useToastManager();

  return toasts.map((toast) => (
    <Toast.Root className="base-toast" key={toast.id} toast={toast}>
      <Toast.Content className="base-toast-content">
        <div className="base-toast-text">
          <Toast.Title className="base-toast-title" />
          <Toast.Description className="base-toast-description" />
        </div>
        <Toast.Close className="base-toast-close">닫기</Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

export function ErrorToastProvider({ children }: ErrorToastProviderProps) {
  return (
    <Toast.Provider limit={3} timeout={6000}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="base-toast-viewport">
          <ErrorToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

export function useErrorToast() {
  const toastManager = Toast.useToastManager();

  return useCallback(
    (message: string) => {
      toastManager.add({
        id: errorToastId,
        title: "오류",
        description: message,
        priority: "high",
        type: "error"
      });
    },
    [toastManager]
  );
}

export function useSuccessToast() {
  const toastManager = Toast.useToastManager();

  return useCallback(
    (message: string, title = "완료") => {
      toastManager.add({
        id: successToastId,
        title,
        description: message,
        priority: "low",
        type: "success"
      });
    },
    [toastManager]
  );
}
