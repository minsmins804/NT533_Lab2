import React, { useState, useEffect } from "react";
import { osClient } from "../api/openstackClient";

export default function VmTab({ appendLog }) {
  const [data, setData] = useState({ imgs: [], flvs: [], nets: [], sgs: [], insts: [], fips: [] });
  const [form, setForm] = useState({ name: "", count: 1, img: "", flv: "", net: "", sg: "" });
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [i, f, n, ins, sgRes, fipRes] = await Promise.all([
        osClient.getImages(),
        osClient.getFlavors(),
        osClient.getNetworks(),
        osClient.getInstances(),
        osClient.getSecurityGroups(),
        osClient.getFloatingIps(),
      ]);
      setData({
        imgs: i.images || [], flvs: f.flavors || [], nets: n.networks || [],
        sgs: sgRes.security_groups || [], insts: ins.servers || [], fips: fipRes.floatingips || [],
      });
    } catch (e) {
      appendLog("Lỗi tải dữ liệu: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (osClient.token) loadData(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.img || !form.flv || !form.net) {
      return alert("Vui lòng điền đủ: Tên, Image, Flavor và Network!");
    }
    appendLog(`Đang khởi tạo VM: ${form.name}...`);
    try {
      await osClient.createInstance(form.name, form.img, form.flv, form.net, form.sg, form.count);
      appendLog("Gửi lệnh tạo VM thành công.");
      setTimeout(loadData, 3000);
    } catch (e) {
      const errorMsg = e.response?.data?.forbidden?.message || e.message;
      appendLog(`Lỗi tạo VM (403): ${errorMsg}. Có thể hết Quota RAM/CPU.`);
    }
  };

  const handleGetPortAndFip = async (serverId) => {
    appendLog("Đang lấy Port ID...");
    try {
      const res = await osClient.getPortInterface(serverId);
      const portId = res.interfaceAttachments[0].port_id;
      appendLog(`Gán Floating IP cho Port: ${portId}...`);
      const fip = await osClient.createAndAssignFip("c3455e8f-ea16-4f5d-ad5e-5c4292015a0d", portId);
      appendLog(`Thành công: ${fip.floatingip.floating_ip_address}`);
      loadData();
    } catch (e) {
      appendLog("Lỗi gán FIP: " + e.message);
    }
  };

  const handleDeleteInstance = async (id, name) => {
    if (!window.confirm(`Xóa máy ảo ${name}?`)) return;
    try {
      await osClient.deleteInstance(id);
      appendLog(`Đã xóa: ${name}`);
      setTimeout(loadData, 2000);
    } catch (e) {
      appendLog("Lỗi xóa: " + e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      <div style={cardStyle}>
        <h4 style={headerStyle}>➕ Launch Instance</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <input style={inputStyle} placeholder="Name" onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={inputStyle} type="number" min="1" value={form.count} onChange={e => setForm({ ...form, count: parseInt(e.target.value) })} />
          <select style={inputStyle} onChange={e => setForm({ ...form, img: e.target.value })}>
            <option value="">-- Image --</option>
            {data.imgs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select style={inputStyle} onChange={e => setForm({ ...form, flv: e.target.value })}>
            <option value="">-- Flavor --</option>
            {data.flvs.map(f => <option key={f.id} value={f.id}>{f.name} ({f.ram}MB)</option>)}
          </select>
          <select style={inputStyle} onChange={e => setForm({ ...form, net: e.target.value })}>
            <option value="">-- Network --</option>
            {data.nets.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <select style={inputStyle} onChange={e => setForm({ ...form, sg: e.target.value })}>
            <option value="">-- Security Group (Optional) --</option>
            {data.sgs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <button style={btnBlue} onClick={handleCreate}>Launch Instance</button>
      </div>

      <button onClick={loadData} style={btnRefresh}>{isLoading ? "🔄 Loading..." : "🚀 Refresh Data"}</button>

      <section>
        <h4 style={labelStyle}>🖥️ Instances</h4>
        <table border="1" style={tableStyle}>
          <thead style={theadStyle}>
            <tr><th>Name</th><th>Status</th><th>IP Address</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.insts.map(ins => (
              <tr key={ins.id}>
                <td style={{ fontWeight: "bold" }}>{ins.name}</td>
                <td style={{ color: ins.status === "ACTIVE" ? "green" : "orange" }}>{ins.status}</td>
                <td>{Object.values(ins.addresses || {}).flat().map(a => <div key={a.addr}>{a.addr}</div>)}</td>
                <td>
                  <button style={miniBtn} onClick={() => handleGetPortAndFip(ins.id)}>Assign FIP</button>
                  <button style={btnDel} onClick={() => handleDeleteInstance(ins.id, ins.name)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <section>
        <h4 style={labelStyle}>🌐 Floating IPs</h4>
        <table border="1" style={tableStyle}>
          <thead style={theadStyle}>
            <tr><th>IP Address</th><th>Mapped Fixed IP</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.fips.map(fip => (
              <tr key={fip.id}>
                <td style={{ fontWeight: "bold", color: "#007bff" }}>{fip.floating_ip_address}</td>
                <td>{fip.fixed_ip_address || "Not Mapped"}</td>
                <td>{fip.status}</td>
                <td><button style={btnDel} onClick={async () => { await osClient.deleteFloatingIp(fip.id); loadData(); }}>Release</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// === CSS STYLES ===
const cardStyle = { background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd", display: "flex", flexDirection: "column", gap: "12px" };
const headerStyle = { margin: "0 0 5px 0", fontSize: "14px", borderBottom: "1px solid #eee", paddingBottom: "5px" };
const inputStyle = { padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" };
const theadStyle = { background: "#f8f9fa" };
const labelStyle = { borderLeft: "4px solid #17a2b8", paddingLeft: "10px", marginBottom: "10px" };
const btnBlue = { background: "#007bff", color: "white", border: "none", padding: "10px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" };
const btnRefresh = { padding: "10px", background: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" };
const btnDel = { color: "red", border: "1px solid red", cursor: "pointer", padding: "2px 8px" };
const miniBtn = { fontSize: "11px", padding: "2px 6px", cursor: "pointer", marginRight: "5px" };