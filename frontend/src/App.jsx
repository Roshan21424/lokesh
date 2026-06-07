import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";

function Placeholder({ title }) {
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold">{title}</h1>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/pos"
          element={
            <Layout>
              <Placeholder title="POS / Orders" />
            </Layout>
          }
        />

        <Route
          path="/menu"
          element={
            <Layout>
              <Placeholder title="Menu Management" />
            </Layout>
          }
        />

        <Route
          path="/history"
          element={
            <Layout>
              <Placeholder title="History" />
            </Layout>
          }
        />

        <Route
          path="/settings"
          element={
            <Layout>
              <Placeholder title="Settings" />
            </Layout>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;