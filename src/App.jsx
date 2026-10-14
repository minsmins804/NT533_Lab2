import React, { useState } from "react";
import AuthTab from "./components/AuthTab";
import NetworkTab from "./components/NetworkTab";
import VmTab from "./components/VmTab";
import LbTab from "./components/LbTab";

export default function App() {
  const [activeTab, setActiveTab] = useState(1);
  const [logs, setLogs] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const appendLog = (msg) =>
    setLogs((prev) => prev + `[${new Date().toLocaleTimeString()}] ${msg}\n`);

  return (
    <div
      style={{ padding: "20px", fontFamily: "Segoe UI, Tahoma, sans-serif" }}
    >
      <h2>OpenStack Manager Dashboard</h2>
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        {[1, 2, 3, 4].map((num) => (
          <button
            key={num}
            onClick={() => setActiveTab(num)}
            disabled={num > 1 && !isAuthenticated}
            style={{
              fontWeight: activeTab === num ? "bold" : "normal",
              padding: "10px",
            }}
          >
            {num === 1
              ? "Xác thực"
              : num === 2
                ? "Mạng"
                : num === 3
                  ? "Máy ảo & FIP"
                  : "Cân bằng tải"}
          </button>
        ))}
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          minHeight: "400px",
          borderRadius: "8px",
        }}
      >
        {activeTab === 1 && (
          <AuthTab
            appendLog={appendLog}
            onLoginSuccess={() => setIsAuthenticated(true)}
          />
        )}
        {activeTab === 2 && <NetworkTab appendLog={appendLog} />}
        {activeTab === 3 && <VmTab appendLog={appendLog} />}
        {activeTab === 4 && <LbTab appendLog={appendLog} />}
      </div>

      <div style={{ marginTop: "20px" }}>
        <strong>System Logs:</strong>
        <textarea
          value={logs}
          readOnly
          style={{
            width: "100%",
            height: "200px",
            marginTop: "5px",
            backgroundColor: "#1e1e1e",
            color: "#00ff00",
            padding: "10px",
          }}
        />
      </div>
    </div>
  );
}
