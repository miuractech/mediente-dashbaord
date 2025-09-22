import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "./theme.ts";

createRoot(document.getElementById("root")!).render(
  <MantineProvider
    forceColorScheme="light"
    theme={theme}
  >
    <App />
    <Notifications />
  </MantineProvider>
);
