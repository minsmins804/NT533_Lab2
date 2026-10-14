import axios from "axios";

class OpenStackClient {
  constructor() {
    this.token = null;
    this.computeUrl = "/api-compute/v2.1";
    this.networkUrl = "/api-network/v2.0";
    this.lbUrl = "/api-loadbalancer/v2.0/lbaas";
    this.identityUrl = "/api-identity/v3";
  }

  getAuthHeaders() {
    return {
      headers: {
        "X-Auth-Token": this.token,
        "Content-Type": "application/json",
      },
    };
  }

  // === XÁC THỰC ===
  async authenticate(identityUrl, username, password, projectName) {
    const payload = {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: username, domain: { name: "Default" }, password: password },
          },
        },
        scope: { project: { name: projectName, domain: { name: "Default" } } },
      },
    };
    try {
      const response = await axios.post(`${this.identityUrl}/auth/tokens`, payload);
      const token = response.headers["x-subject-token"];
      this.token = token; 
      return token; 
    } catch (error) {
      console.error("Auth error:", error);
      return null;
    }
  }

  // === COMPUTE (VMS, IMAGES, FLAVORS) ===
  async getFlavors() {
    const res = await axios.get(`${this.computeUrl}/flavors/detail`, this.getAuthHeaders());
    return res.data;
  }
  async getImages() {
    const res = await axios.get(`${this.computeUrl}/images/detail`, this.getAuthHeaders());
    return res.data;
  }
  async getInstances() {
    const res = await axios.get(`${this.computeUrl}/servers/detail`, this.getAuthHeaders());
    return res.data;
  }
  async createInstance(name, imageId, flavorId, networkId, securityGroupName, count = 1) {
    const payload = {
      server: {
        name: name,
        flavorRef: flavorId, // Vẫn giữ Flavor ID
        networks: [{ uuid: networkId }],
        min_count: count,
        max_count: count,
        // Cấu hình quan trọng để sửa lỗi "zero disk"
        block_device_mapping_v2: [{
          boot_index: 0,
          uuid: imageId,           // ID của hệ điều hành (Ubuntu, CentOS...)
          source_type: "image",
          destination_type: "volume",
          volume_size: 10,         // Tự động tạo ổ cứng 10GB (Hợp lệ cho sinh viên)
          delete_on_termination: true // Xóa ổ cứng khi xóa máy ảo để giải phóng dung lượng
        }]
      },
    };

    if (securityGroupName && securityGroupName.trim() !== "") {
      payload.server.security_groups = [{ name: securityGroupName }];
    }

    const res = await axios.post(`${this.computeUrl}/servers`, payload, this.getAuthHeaders());
    return res.data;
  }
  async deleteInstance(id) {
    return await axios.delete(`${this.computeUrl}/servers/${id}`, this.getAuthHeaders());
  }
  async getPortInterface(serverId) {
    const res = await axios.get(`${this.computeUrl}/servers/${serverId}/os-interface`, this.getAuthHeaders());
    return res.data;
  }

  // === NETWORK (NETS, SUBS, ROUTERS, FIPS, SGS) ===
  async getNetworks() {
    return (await axios.get(`${this.networkUrl}/networks`, this.getAuthHeaders())).data;
  }
  async getSubnets() {
    return (await axios.get(`${this.networkUrl}/subnets`, this.getAuthHeaders())).data;
  }
  async getRouters() {
    return (await axios.get(`${this.networkUrl}/routers`, this.getAuthHeaders())).data;
  }
  async getSecurityGroups() {
    return (await axios.get(`${this.networkUrl}/security-groups`, this.getAuthHeaders())).data;
  }
  async getFloatingIps() {
    return (await axios.get(`${this.networkUrl}/floatingips`, this.getAuthHeaders())).data;
  }
  async createNetwork(name) {
    const payload = { network: { name: name, admin_state_up: true } };
    return (await axios.post(`${this.networkUrl}/networks`, payload, this.getAuthHeaders())).data;
  }
  async createSubnet(networkId, name, cidr) {
    const payload = {
      subnet: {
        network_id: networkId,
        name: name || (networkId.substring(0, 8) + "-sub"),
        ip_version: 4,
        cidr: cidr,
        dns_nameservers: ["8.8.8.8", "1.1.1.1"],
      },
    };
    return (await axios.post(`${this.networkUrl}/subnets`, payload, this.getAuthHeaders())).data;
  }
  async createRouter(name, extNetId = "c3455e8f-ea16-4f5d-ad5e-5c4292015a0d") {
    const payload = {
      router: { name: name, admin_state_up: true, external_gateway_info: { network_id: extNetId } },
    };
    return (await axios.post(`${this.networkUrl}/routers`, payload, this.getAuthHeaders())).data;
  }
  async createAndAssignFip(floatingNetworkId, portId) {
    const payload = { floatingip: { floating_network_id: floatingNetworkId, port_id: portId } };
    return (await axios.post(`${this.networkUrl}/floatingips`, payload, this.getAuthHeaders())).data;
  }
  async deleteFloatingIp(id) {
    return await axios.delete(`${this.networkUrl}/floatingips/${id}`, this.getAuthHeaders());
  }
  async deleteNetwork(id) {
    return await axios.delete(`${this.networkUrl}/networks/${id}`, this.getAuthHeaders());
  }
  async deleteSubnet(id) {
    return await axios.delete(`${this.networkUrl}/subnets/${id}`, this.getAuthHeaders());
  }
  async deleteRouter(id) {
    return await axios.delete(`${this.networkUrl}/routers/${id}`, this.getAuthHeaders());
  }

  // === LOAD BALANCER ===
  async getLoadBalancers() {
    return (await axios.get(`${this.lbUrl}/loadbalancers`, this.getAuthHeaders())).data;
  }
  async getPools() {
    return (await axios.get(`${this.lbUrl}/pools`, this.getAuthHeaders())).data;
  }
  async createFullLoadBalancer(data) {
    const payload = {
      loadbalancer: {
        name: data.name,
        vip_subnet_id: data.subnetId,
        listeners: [{
          name: data.name + "-lsnr", protocol: data.protocol, protocol_port: data.port,
          connection_limit: data.connectionLimit,
          default_pool: {
            name: data.name + "-pool", protocol: data.protocol, lb_algorithm: data.algorithm,
            healthmonitor: {
              name: data.name + "-hm", type: data.type, delay: data.delay, timeout: data.timeout,
              max_retries: data.maxRetries, max_retries_down: data.maxRetriesDown,
            }
          }
        }]
      }
    };
    return (await axios.post(`${this.lbUrl}/loadbalancers`, payload, this.getAuthHeaders())).data;
  }
  async deleteLoadBalancer(id) {
    return await axios.delete(`${this.lbUrl}/loadbalancers/${id}?cascade=true`, this.getAuthHeaders());
  }
}

export const osClient = new OpenStackClient();