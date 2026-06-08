import { AppShell } from "./components/AppShell";
import { ErrorToastProvider } from "./components/ErrorToasts";

export function App() {
  return (
    <ErrorToastProvider>
      <AppShell />
    </ErrorToastProvider>
  );
}
