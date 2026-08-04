import { useRoutes } from "react-router-dom";

import { AuthProvider } from "../features/auth/AuthContext";
import { routes } from "./routes";

function Routes() {
  return useRoutes(routes);
}

export function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
