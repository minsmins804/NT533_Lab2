import React, { useState, useEffect } from "react";
import { osClient } from "../api/openstackClient";

export default function LbTab({ appendLog }) {
  const [lbs, setLbs] = useState([]);
  const [subs, setSubs] = useState([]);
  const [pools, setPools] = useState([]);
  const [insts, setInsts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", subnetId: "", protocol: "HTTP", port: 80,
    connectionLimit: -1, algorithm: "ROUND_ROBIN",
    type: "HTTP", delay: 5, timeout: 5, maxRetries: 3, maxRetriesDown: 3,
    poolId: "", instId: ""
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [l, s, p, i] = await Promise.all([
        osClient.getLoadBalancers(),
        osClient.getSubnets(),
        osClient.getPools(),
        osClient.getInstances(),
      ]);
      setLbs(l.loadbalancers || []);
      setSubs(s.subnets || []);
      setPools(p.pools || []);
      setInsts(i.servers || []);
    } catch (e) {
      appendLog("Lỗi tải dữ liệu LB: " + e.message);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { if (osClient.token) loadData(); }, []);

  const handleCreateLB = async () => {
    if (!form.name || !form.subnetId) return alert("Vui lòng nhập tên và chọn Subnet!");
    appendLog(`Đang khởi tạo Load Balancer: ${form.name}...`);
    try {
      await osClient.createFullLoadBalancer(form);
      appendLog("Gửi lệnh tạo LB thành công (bao gồm Listener, Pool và Health Monitor).");
      setTimeout(loadData, 3000);
    } catch (e) { appendLog("Lỗi tạo LB: " + e.message); }
  };

  const handleDeleteLB = async (id, name) => {
    if (!window.confirm(`Xóa Load Balancer ${name} và các thành phần liên quan?`)) return;
    try {
      await osClient.deleteLoadBalancer(id);
      appendLog(`Đã xóa LB: ${name}`);
      loadData();
    } catch (e) { appendLog("Lỗi xóa LB: " + e.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      {/* 1. FORM TẠO LB ĐẦY ĐỦ THÔNG SỐ */}
      <div style={cardStyle}>
        <h4 style={headerStyle}>➕ Create Load Balancer (Full Setup)</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
          <input style={inputStyle} placeholder="Name" onChange={e => setForm({...form, name: e.target.value})} />
          <select style={inputStyle} onChange={e => setForm({...form, subnetId: e.target.value})}>
            <option value="">-- VIP Subnet --</option>
            {subs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.cidr})</option>)}
          </select>
          <select style={inputStyle} onChange={e => setForm({...form, protocol: e.target.value})}>
            <option value="HTTP">HTTP</option><option value="TCP">TCP</option><option value="TERMINATED_HTTPS">HTTPS</option>
          </select>
          <input style={inputStyle} type="number" placeholder="Port" value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value)})} />
          
          <input style={inputStyle} type="number" placeholder="Conn Limit" onChange={e => setForm({...form, connectionLimit: parseInt(e.target.value)})} />
          <select style={inputStyle} onChange={e => setForm({...form, algorithm: e.target.value})}>
            <option value="ROUND_ROBIN">ROUND_ROBIN</option><option value="LEAST_CONNECTIONS">LEAST_CONNECTIONS</option><option value="SOURCE_IP">SOURCE_IP</option>
          </select>
          <select style={inputStyle} onChange={e => setForm({...form, type: e.target.value})}>
            <option value="HTTP">HM: HTTP</option><option value="TCP">HM: TCP</option><option value="PING">HM: PING</option>
          </select>
          <input style={inputStyle} type="number" placeholder="Delay (sec)" value={form.delay} onChange={e => setForm({...form, delay: parseInt(e.target.value)})} />
          
          <input style={inputStyle} type="number" placeholder="Timeout (sec)" value={form.timeout} onChange={e => setForm({...form, timeout: parseInt(e.target.value)})} />
          <input style={inputStyle} type="number" placeholder="Max Retries" value={form.maxRetries} onChange={e => setForm({...form, maxRetries: parseInt(e.target.value)})} />
          <input style={inputStyle} type="number" placeholder="Max Retries Down" value={form.maxRetriesDown} onChange={e => setForm({...form, maxRetriesDown: parseInt(e.target.value)})} />
        </div>
        <button style={btnBlue} onClick={handleCreateLB}>Create Load Balancer</button>
      </div>

      <button onClick={loadData} style={btnRefresh}>{isLoading ? "🔄 Loading..." : "🚀 Refresh Load Balancers"}</button>

      {/* 2. DANH SÁCH LOAD BALANCER */}
      <section>
        <h4 style={labelStyle}>⚖️ Load Balancers</h4>
        <table border="1" style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th>ID</th><th>Name</th><th>VIP Address</th><th>Provisioning Status</th><th>Operating Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lbs.map(lb => (
              <tr key={lb.id}>
                <td style={idColStyle}>{lb.id.substring(0,8)}...</td>
                <td style={{fontWeight:"bold"}}>{lb.name}</td>
                <td>{lb.vip_address}</td>
                <td style={{color: lb.provisioning_status === "ACTIVE" ? "green" : "orange"}}>{lb.provisioning_status}</td>
                <td>{lb.operating_status}</td>
                <td><button style={btnDel} onClick={() => handleDeleteLB(lb.id, lb.name)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// === CSS STYLES (Giữ phong cách đồng nhất với Network/VM Tab) ===
const cardStyle = { background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", display: "flex", flexDirection: "column", gap: "12px" };
const headerStyle = { margin: "0 0 5px 0", fontSize: "14px", color: "#333", borderBottom: "1px solid #eee", paddingBottom: "5px" };
const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" };
const theadStyle = { background: "#f8f9fa", color: "#333" };
const labelStyle = { borderLeft: "4px solid #6f42c1", paddingLeft: "10px", marginBottom: "10px", color: "#333" };
const idColStyle = { fontSize: "10px", color: "#888", fontFamily: "monospace" };
const btnBlue = { background: "#007bff", color: "white", border: "none", padding: "10px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" };
const btnRefresh = { padding: "10px", background: "#17a2b8", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" };
const btnDel = { color: "red", background: "none", border: "1px solid red", borderRadius: "3px", cursor: "pointer", padding: "2px 8px" };