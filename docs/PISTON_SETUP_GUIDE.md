# Piston Self-Hosting Guide (Oracle Cloud Always Free)
## Relearn.ai Compiler & Code Execution Engine

This guide provides the exact step-by-step instructions to deploy a private, unlimited **Piston** code execution engine on an **Oracle Cloud Always Free VM** at **$0.00/month forever**.

---

### Prerequisites & Architecture
* **Target OS:** Ubuntu 22.04 LTS (Minimal or Server)
* **Compute Shape:** `VM.Standard.A1.Flex` (Ampere Altra ARM64)
* **Allocated Resources:** 2 OCPUs, 12 GB RAM, 50 GB+ NVMe SSD
* **Monthly Cost:** **$0.00** (Always Free tier)
* **Security Isolation:** Linux namespaces, cgroups v2, Google `isolate`, dropped capabilities, no network access inside sandboxes (`--net=none`).

---

### Step 1: Create Your Oracle Cloud Always Free Account
1. Visit: **[https://cloud.oracle.com/free/](https://cloud.oracle.com/free/)**
2. Complete registration.
   > *Note:* Oracle requires a credit card for identity verification. It places a temporary \$1 authorization hold that is immediately refunded. You will **never** be billed as long as you keep resources within the Always Free limits.
3. Select your closest Home Region (e.g., US East, US West, Mumbai, Frankfurt).

---

### Step 2: Provision the Always Free VM
1. From the Oracle Cloud Console, navigate to:  
   **Compute** → **Instances** → **Create Instance**.
2. **Name:** `relearn-piston-engine`
3. **Image and Shape:**
   * Click **Change Image** → Select **Canonical Ubuntu** → **22.04 Minimal**.
   * Click **Change Shape** → Select **Ampere** (ARM Architecture) → **VM.Standard.A1.Flex**:
     * Number of OCPUs: `2`
     * Amount of Memory: `12 GB`
     * *(Ensure the "Always Free Eligible" banner is displayed).*
4. **Networking:**
   * Select your default VCN and public subnet.
   * Ensure **Assign a public IPv4 address** is checked.
5. **SSH Keys:**
   * Select **Generate a key pair for me** → Download both **Private Key** (`.key`) and **Public Key**.
6. Click **Create** and wait ~60 seconds for the instance status to turn **Running**.
7. Note your **Public IP Address** (e.g. `129.153.xx.xx`).

---

### Step 3: Configure Oracle Cloud Firewall (Ingress Rules)
By default, Oracle Cloud blocks incoming traffic on non-standard ports. You must open port `2000`:
1. On your instance details page, click on your **Subnet** link under *Primary VNIC*.
2. Click on the **Default Security List for...**.
3. Under **Ingress Rules**, click **Add Ingress Rules**:
   * **Source Type:** `CIDR`
   * **Source CIDR:** `0.0.0.0/0`
   * **IP Protocol:** `TCP`
   * **Source Port Range:** `All`
   * **Destination Port Range:** `2000`
   * **Description:** `Piston Code Execution API`
4. Click **Add Ingress Rules**.

---

### Step 4: SSH Into the Server & Install Docker
Open your terminal (PowerShell on Windows, or Bash on macOS/Linux):
```bash
# Set proper permissions for your private key (Linux/macOS)
chmod 400 /path/to/ssh-key.key

# Connect to your server
ssh -i /path/to/ssh-key.key ubuntu@YOUR_SERVER_PUBLIC_IP
```

Run this command block to update packages and install Docker:
```bash
# 1. Update system & install dependencies
sudo apt-get update && sudo apt-get install -y docker.io docker-compose iptables-persistent

# 2. Enable and start Docker service
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# 3. Allow port 2000 through Ubuntu internal firewall (UFW/iptables)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 2000 -j ACCEPT
sudo netfilter-persistent save
```

---

### Step 5: Deploy Piston via Docker Compose
Create the Piston application directory and deployment file:
```bash
mkdir -p ~/piston && cd ~/piston

cat << 'EOF' > docker-compose.yaml
version: '3.8'

services:
  piston:
    image: ghcr.io/engineer-man/piston
    container_name: piston_api
    restart: always
    privileged: true
    ports:
      - "2000:2000"
    environment:
      - PISTON_BIND_ADDRESS=0.0.0.0:2000
      - PISTON_MAX_CONCURRENT_JOBS=10
      - PISTON_RUN_TIMEOUT=5000
      - PISTON_COMPILE_TIMEOUT=15000
    volumes:
      - /tmp/piston/packages:/piston/packages
EOF

# Start Piston daemon
docker-compose up -d
```

Verify the container is running:
```bash
docker ps
# Status should show: Up (healthy) 0.0.0.0:2000->2000/tcp
```

---

### Step 6: Install Required Language Runtimes
Piston uses `ppman` (Piston Package Manager) so you only install the runtimes Relearn.ai needs:

```bash
docker exec -it piston_api cli ppman install python
docker exec -it piston_api cli ppman install rust
docker exec -it piston_api cli ppman install dart
docker exec -it piston_api cli ppman install gcc
docker exec -it piston_api cli ppman install java
docker exec -it piston_api cli ppman install go
docker exec -it piston_api cli ppman install sqlite3
docker exec -it piston_api cli ppman install node
docker exec -it piston_api cli ppman install typescript
```

Verify installed packages:
```bash
docker exec -it piston_api cli ppman list
```

---

### Step 7: Test Your Server
From your local computer terminal, run this test `curl`:
```bash
curl -X POST http://YOUR_SERVER_PUBLIC_IP:2000/api/v2/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "version": "*",
    "files": [{ "content": "print(\"Hello from Relearn.ai Piston Engine!\")" }]
  }'
```

**Expected Response:**
```json
{
  "language": "python",
  "version": "3.12.0",
  "run": {
    "stdout": "Hello from Relearn.ai Piston Engine!\n",
    "stderr": "",
    "code": 0,
    "signal": null,
    "output": "Hello from Relearn.ai Piston Engine!\n"
  }
}
```

---

### Step 8: Connect to Relearn.ai
Once your instance is running, provide the server URL or IP to Antigravity:
1. Environment variable `PISTON_API_URL=http://YOUR_SERVER_IP:2000` is configured in Netlify.
2. `netlify/functions/compiler-proxy.mts` routes all compiled student requests safely through your server.
3. Client-side JS/HTML continues running zero-overhead in browser WebAssembly/DOM.
