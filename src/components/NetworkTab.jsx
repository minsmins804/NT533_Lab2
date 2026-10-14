import React, { useState, useEffect } from "react";
import { osClient } from "../api/openstackClient";

export default function NetworkTab({ appendLog }) {
  const [networks, setNetworks] = useState([]);
  const [subnets, setSubnets] = useState([]);
  const [routers, setRouters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // States cho Form Tạo mới theo yêu cầu của bạn 
  const [formNet, setFormNet] = useState({ name: "", subName: "", cidr: "192.168.1.0/24" });
  const [formRouter, setFormRouter] = useState({ name: "", extNetId: "" });
  const [formSub, setFormSub] = useState({ netId: "", name: "", cidr: "192.168.2.0/24" });

  const refreshAll = async () => {
    setIsLoading(true);
    appendLog("Đang đồng bộ dữ liệu mạng chi tiết...");
    try {
      const [n, s, r] = await Promise.all([
        osClient.getNetworks(),
        osClient.getSubnets(),
        osClient.getRouters(),
      ]);
      setNetworks(n.networks || []);
      setSubnets(s.subnets || []);
      setRouters(r.routers || []);
      appendLog("=> Đã tải danh sách Networks, Subnets và Routers.");
    } catch (err) {
      appendLog("Lỗi tải dữ liệu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (osClient.token) refreshAll(); }, []);

  // --- ACTIONS ---
  const handleCreateNet = async () => {
    if (!formNet.name || !formNet.cidr) return alert("Vui lòng nhập đủ thông tin Network!");
    appendLog(`Bắt đầu tạo Network: ${formNet.name}...`);
    try {
      const res = await osClient.createNetwork(formNet.name);
      const netId = res.network.id;
      appendLog(`=> Tạo Network xong. Đang tạo Subnet: ${formNet.subName || "default-sub"}...`);
      await osClient.createSubnet(netId, formNet.subName || (formNet.name + "-sub"), formNet.cidr);
      appendLog("=> Hoàn tất tạo Network và Subnet!");
      refreshAll();
    } catch (err) { appendLog("Lỗi: " + err.message); }
  };

  const handleCreateSub = async () => {
    if (!formSub.netId || !formSub.cidr) return alert("Chọn Network và nhập CIDR!");
    try {
      await osClient.createSubnet(formSub.netId, formSub.name, formSub.cidr);
      appendLog(`Đã tạo Subnet: ${formSub.name}`);
      refreshAll();
    } catch (err) { appendLog("Lỗi: " + err.message); }
  };

  const handleCreateRouter = async () => {
    if (!formRouter.name || !formRouter.extNetId) return alert("Vui lòng nhập tên Router và chọn External Network!");
    try {
      await osClient.createRouter(formRouter.name, formRouter.extNetId);
      appendLog(`Đã tạo Router: ${formRouter.name}`);
      refreshAll();
    } catch (err) { appendLog("Lỗi: " + err.message); }
  };

  const deleteItem = async (type, id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${type}: ${name}?`)) return;
    try {
      if (type === "Network") await osClient.deleteNetwork(id);
      if (type === "Subnet") await osClient.deleteSubnet(id);
      if (type === "Router") await osClient.deleteRouter(id);
      appendLog(`Đã xóa ${type}: ${name}`);
      refreshAll();
    } catch (err) { appendLog(`Lỗi khi xóa ${type}: ` + err.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      
      {/* 1. CÁC FORM TẠO MỚI  */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
        
        {/* Tạo Network (Bao gồm Subnet đi kèm) */}
        <div style={cardStyle}>
          <h4 style={headerStyle}>➕ Create Network</h4>
          <input style={inputStyle} placeholder="Network Name" onChange={e => setFormNet({...formNet, name: e.target.value})} />
          <input style={inputStyle} placeholder="Subnet Name" onChange={e => setFormNet({...formNet, subName: e.target.value})} />
          <input style={inputStyle} placeholder="Network Address (CIDR)" value={formNet.cidr} onChange={e => setFormNet({...formNet, cidr: e.target.value})} />
          <button style={btnBlue} onClick={handleCreateNet}>Create Network</button>
        </div>

        {/* Tạo Subnet (Giữ nguyên logic chọn Network) */}
        <div style={cardStyle}>
          <h4 style={headerStyle}>➕ Create Subnet</h4>
          <select style={inputStyle} onChange={e => setFormSub({...formSub, netId: e.target.value})}>
            <option value="">-- Select Network --</option>
            {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <input style={inputStyle} placeholder="Subnet Name" onChange={e => setFormSub({...formSub, name: e.target.value})} />
          <input style={inputStyle} placeholder="Network Address (CIDR)" value={formSub.cidr} onChange={e => setFormSub({...formSub, cidr: e.target.value})} />
          <button style={btnBlue} onClick={handleCreateSub}>Create Subnet</button>
        </div>

        {/* Tạo Router (Với External Network)  */}
        <div style={cardStyle}>
          <h4 style={headerStyle}>➕ Create Router</h4>
          <input style={inputStyle} placeholder="Router Name" onChange={e => setFormRouter({...formRouter, name: e.target.value})} />
          <select style={inputStyle} onChange={e => setFormRouter({...formRouter, extNetId: e.target.value})}>
            <option value="">-- External Network --</option>
            {networks.filter(n => n["router:external"]).map(n => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
          <button style={btnGreen} onClick={handleCreateRouter}>Create Router</button>
        </div>
      </div>

      <button onClick={refreshAll} style={btnRefresh}>{isLoading ? "🔄 Synchronizing..." : "🚀 Get All Data"}</button>

      {/* 2. CÁC BẢNG DANH SÁCH CHI TIẾT  */}
      
      {/* Danh sách Networks */}
      <section>
        <h4 style={labelStyle}>🌐 Networks</h4>
        <table border="1" style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Subnets Associated</th>
              <th>Status</th>
              <th>Admin State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {networks.map(n => (
              <tr key={n.id}>
                <td style={idColStyle}>{n.id}</td>
                <td style={{color: "#d9534f", fontWeight: "bold"}}>{n.name}</td>
                <td>
                  {subnets.filter(s => s.network_id === n.id).map(s => (
                    <div key={s.id} style={{fontSize: "11px"}}>{s.name} ({s.cidr})</div>
                  ))}
                </td>
                <td style={{color: "green"}}>{n.status}</td>
                <td>{n.admin_state_up ? "True" : "False"}</td>
                <td><button style={btnDel} onClick={() => deleteItem("Network", n.id, n.name)}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Danh sách Subnets (Mới thêm theo yêu cầu)  */}
      <section>
        <h4 style={labelStyle}>🧬 Subnets</h4>
        <table border="1" style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Network Address (CIDR)</th>
              <th>Gateway IP</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subnets.map(s => (
              <tr key={s.id}>
                <td style={idColStyle}>{s.id}</td>
                <td>{s.name}</td>
                <td style={{fontWeight: "bold"}}>{s.cidr}</td>
                <td>{s.gateway_ip}</td>
                <td><button style={btnDel} onClick={() => deleteItem("Subnet", s.id, s.name)}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Danh sách Routers */}
      <section>
        <h4 style={labelStyle}>🔌 Routers</h4>
        <table border="1" style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Status</th>
              <th>External Network (Gateway)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routers.map(r => (
              <tr key={r.id}>
                <td style={idColStyle}>{r.id}</td>
                <td style={{color: "#d9534f", fontWeight: "bold"}}>{r.name}</td>
                <td style={{color: "green"}}>{r.status}</td>
                <td style={{fontSize: "11px"}}>{r.external_gateway_info?.network_id || "None"}</td>
                <td><button style={btnDel} onClick={() => deleteItem("Router", r.id, r.name)}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// === CSS STYLES ===
const cardStyle = { background: "#fff", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", display: "flex", flexDirection: "column", gap: "8px" };
const headerStyle = { margin: "0 0 5px 0", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee", paddingBottom: "5px" };
const inputStyle = { padding: "7px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" };
const theadStyle = { background: "#f8f9fa", color: "#333" };
const labelStyle = { borderLeft: "4px solid #d9534f", paddingLeft: "10px", marginBottom: "10px", color: "#333" };
const idColStyle = { fontSize: "10px", color: "#888", fontFamily: "monospace" };
const btnBlue = { background: "#007bff", color: "white", border: "none", padding: "8px", borderRadius: "4px", cursor: "pointer" };
const btnGreen = { background: "#28a745", color: "white", border: "none", padding: "8px", borderRadius: "4px", cursor: "pointer" };
const btnRefresh = { padding: "10px", background: "#17a2b8", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" };
const btnDel = { color: "red", background: "none", border: "1px solid red", borderRadius: "3px", cursor: "pointer", padding: "2px 8px" };