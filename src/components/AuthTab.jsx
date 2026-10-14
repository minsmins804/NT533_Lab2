import React, { useState } from "react";
import { osClient } from "../api/openstackClient";

export default function AuthTab({ appendLog, onLoginSuccess }) {
  const [identityUrl, setIdentityUrl] = useState("/api-identity/v3");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [projectName, setProjectName] = useState("NT533.Q21.G14");
  const [isLoading, setIsLoading] = useState(false);

  // States lưu trữ danh sách dữ liệu thực tế
  const [flavors, setFlavors] = useState([]);
  const [images, setImages] = useState([]);

  // Hàm định dạng dung lượng giống hệt thực tế (MB, GB)
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return "-";
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${val} ${sizes[i]}`;
  };

  const handleGetFlavors = async () => {
    appendLog("Đang kết nối API lấy danh sách Flavor...");
    try {
      const data = await osClient.getFlavors();
      setFlavors(data.flavors || []);
      appendLog(`[HỆ THỐNG] Đã tải ${data.flavors?.length || 0} cấu hình flavor.`);
    } catch (err) {
      appendLog(`[LỖI] Không thể lấy danh sách Flavor: ${err.message}`);
    }
  };

  const handleGetImages = async () => {
    appendLog("Đang kết nối API lấy danh sách Image...");
    try {
      const data = await osClient.getImages();
      setImages(data.images || []);
      appendLog(`[HỆ THỐNG] Đã tải thành công ${data.images?.length || 0} Images.`);
    } catch (err) {
      appendLog(`[LỖI] Không thể lấy danh sách Image: ${err.message}`);
    }
  };

  const handleLogin = async () => {
    appendLog("-------------------------------------------");
    appendLog("Gửi yêu cầu xác thực tới Identity Service...");
    setIsLoading(true);

    const token = await osClient.authenticate(identityUrl, username, password, projectName);

    if (token) {
      appendLog("Xác thực THÀNH CÔNG!");
      appendLog(`[X-SUBJECT-TOKEN]: ${token}`);
      onLoginSuccess();
    } else {
      appendLog("Xác thực THẤT BẠI. Kiểm tra lại Username/Password.");
    }
    setIsLoading(false);
    appendLog("-------------------------------------------");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      
      {/* KHUNG XÁC THỰC */}
      <div style={cardStyle}>
        <h4 style={headerStyle}>🔑 OpenStack Authentication</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <div style={inputGroup}>
            <label style={labelStyle}>Identity URL</label>
            <input style={inputStyle} value={identityUrl} onChange={(e) => setIdentityUrl(e.target.value)} />
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Project Name</label>
            <input style={inputStyle} value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Username</label>
            <input style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div style={inputGroup}>
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
          <button style={btnBlue} onClick={handleLogin} disabled={isLoading}>
            {isLoading ? "Authenticating..." : "Login"}
          </button>
          <button style={btnGray} onClick={handleGetFlavors}>Get Flavors</button>
          <button style={btnGray} onClick={handleGetImages}>Get Images</button>
        </div>
      </div>

      {/* DANH SÁCH FLAVORS */}
      <section>
        <h5 style={labelHeader}>🍦 Flavors List</h5>
        <div style={tableContainer}>
          <table border="1" style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th>ID</th>
                <th>Flavor Name</th>
                <th>VCPUs</th>
                <th>RAM</th>
                <th>Disk</th>
              </tr>
            </thead>
            <tbody>
              {flavors.length > 0 ? flavors.map(f => (
                <tr key={f.id}>
                  <td style={idStyle}>{f.id}</td>
                  <td style={{fontWeight: "bold", color: "#d9534f"}}>{f.name}</td>
                  <td>{f.vcpus}</td>
                  <td>{f.ram} MB</td>
                  <td>{f.disk} GB</td>
                </tr>
              )) : <tr><td colSpan="5" style={noDataStyle}>Bấm "Get Flavors" để lấy dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* DANH SÁCH IMAGES */}
      <section>
        <h5 style={labelHeader}>💿 Images List</h5>
        <div style={tableContainer}>
          <table border="1" style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th>ID</th>
                <th>Image Name</th>
                <th>Status</th>
                <th>Visibility</th>
                <th>Disk Format</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {images.length > 0 ? images.map(img => (
                <tr key={img.id}>
                  <td style={idStyle}>{img.id.substring(0, 8)}...</td>
                  <td style={{fontWeight: "bold", color: "#d9534f"}}>{img.name}</td>
                  <td style={{color: img.status === "active" ? "green" : "orange", textTransform: 'capitalize'}}>
                    {img.status}
                  </td>
                  <td>{img.visibility === 'public' ? 'Public' : 'Private'}</td>
                  <td>{img.disk_format?.toUpperCase() || "QCOW2"}</td>
                  <td style={{fontWeight: "500"}}>
                    {formatSize(img.size || img['OS-EXT-IMG-SIZE:size'])}
                  </td>
                </tr>
              )) : <tr><td colSpan="6" style={noDataStyle}>Bấm "Get Images" để lấy dữ liệu</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// === CSS STYLES ===
const cardStyle = { background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #ddd", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
const headerStyle = { margin: "0 0 20px 0", fontSize: "16px", color: "#333", borderBottom: "1px solid #eee", paddingBottom: "10px" };
const inputGroup = { display: "flex", flexDirection: "column", gap: "5px" };
const labelStyle = { fontSize: "12px", color: "#666", fontWeight: "bold" };
const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px" };
const btnBlue = { background: "#007bff", color: "white", border: "none", padding: "10px 25px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" };
const btnGray = { background: "#6c757d", color: "white", border: "none", padding: "10px 15px", borderRadius: "4px", cursor: "pointer" };
const labelHeader = { borderLeft: "4px solid #d9534f", paddingLeft: "10px", marginBottom: "10px", fontSize: "14px", fontWeight: "bold" };
const tableContainer = { overflowX: "auto", border: "1px solid #eee", borderRadius: "4px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" };
const theadStyle = { background: "#f8f9fa", color: "#333" };
const idStyle = { fontSize: "10px", color: "#888", fontFamily: "monospace", padding: "5px" };
const noDataStyle = { textAlign: "center", color: "#999", padding: "20px" };