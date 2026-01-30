#!/bin/bash
# Naver Commerce Proxy Server Setup Script
# Run on: Naver Cloud Server (Ubuntu 24.04)
# Usage: bash setup.sh

set -e

echo "=== Naver Commerce Proxy Setup ==="

# 1. Install Node.js 20 LTS
echo "[1/6] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# 2. Create app directory
echo "[2/6] Setting up app directory..."
mkdir -p /opt/naver-proxy
cp server.js /opt/naver-proxy/
cp package.json /opt/naver-proxy/

# 3. Install dependencies
echo "[3/6] Installing dependencies..."
cd /opt/naver-proxy
npm install --production

# 4. Create environment file
echo "[4/6] Creating environment file..."
if [ ! -f /opt/naver-proxy/.env ]; then
  cat > /opt/naver-proxy/.env << 'ENVEOF'
PORT=3100
PROXY_API_KEY=howpapa-naver-proxy-2024-secret
ENVEOF
  echo "Created .env file. Please update PROXY_API_KEY!"
else
  echo ".env already exists, skipping..."
fi

# 5. Create systemd service
echo "[5/6] Creating systemd service..."
cat > /etc/systemd/system/naver-proxy.service << 'EOF'
[Unit]
Description=Naver Commerce Proxy Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/naver-proxy
EnvironmentFile=/opt/naver-proxy/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 6. Enable and start service
echo "[6/6] Starting service..."
systemctl daemon-reload
systemctl enable naver-proxy
systemctl start naver-proxy

echo ""
echo "=== Setup Complete ==="
echo "Status: $(systemctl is-active naver-proxy)"
echo "Logs:   journalctl -u naver-proxy -f"
echo "URL:    http://localhost:3100/health"
echo ""
echo "IMPORTANT: Update /opt/naver-proxy/.env with your actual PROXY_API_KEY"
