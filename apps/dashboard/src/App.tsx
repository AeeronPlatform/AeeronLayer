import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { ChannelsPage } from "./pages/ChannelsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { DocsPage } from "./pages/DocsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>
    </Routes>
  );
}
