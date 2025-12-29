#!/bin/bash

# x402-application - Start all services script
# Starts: Client (3000), Server (3001), Service (4000), Facilitator (9000)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Store PIDs for cleanup
PIDS=()

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}Shutting down all services...${NC}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      echo "Killing process $pid..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
  echo -e "${BLUE}All services stopped${NC}"
  exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM EXIT

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting x402-application services${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if all directories exist
if [ ! -d "$SCRIPT_DIR/client" ] || [ ! -d "$SCRIPT_DIR/server" ] || [ ! -d "$SCRIPT_DIR/service" ]; then
  echo -e "${RED}Error: Required directories not found${NC}"
  exit 1
fi

# Start Service Facilitator (port 9000)
echo -e "${GREEN}[1/4]${NC} Starting Service Facilitator (port 9000)..."
cd "$SCRIPT_DIR/service"
node src/facilitator.ts > "$SCRIPT_DIR/.logs/facilitator.log" 2>&1 &
FACILITATOR_PID=$!
PIDS+=($FACILITATOR_PID)
echo -e "${GREEN}✓ Facilitator started (PID: $FACILITATOR_PID)${NC}"
sleep 2

# Start Service Server (port 4000)
echo -e "${GREEN}[2/4]${NC} Starting Service Server (port 4000)..."
cd "$SCRIPT_DIR/service"
node src/server.ts > "$SCRIPT_DIR/.logs/service.log" 2>&1 &
SERVICE_PID=$!
PIDS+=($SERVICE_PID)
echo -e "${GREEN}✓ Service started (PID: $SERVICE_PID)${NC}"
sleep 2

# Start Backend Server (port 3001)
echo -e "${GREEN}[3/4]${NC} Starting Backend Server (port 3001)..."
cd "$SCRIPT_DIR/server"
node src/index.ts > "$SCRIPT_DIR/.logs/server.log" 2>&1 &
SERVER_PID=$!
PIDS+=($SERVER_PID)
echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
sleep 2

# Start Client (port 3000)
echo -e "${GREEN}[4/4]${NC} Starting Client (port 3000)..."
cd "$SCRIPT_DIR/client"
npm run dev > "$SCRIPT_DIR/.logs/client.log" 2>&1 &
CLIENT_PID=$!
PIDS+=($CLIENT_PID)
echo -e "${GREEN}✓ Client started (PID: $CLIENT_PID)${NC}"
sleep 2

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}All services started successfully!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Service URLs:${NC}"
echo -e "  Client:      ${GREEN}http://localhost:3000${NC}"
echo -e "  Server:      ${GREEN}http://localhost:3001${NC}"
echo -e "  Service:     ${GREEN}http://localhost:4000${NC}"
echo -e "  Facilitator: ${GREEN}http://localhost:9000${NC}\n"

echo -e "${YELLOW}Log files:${NC}"
echo -e "  Client:      ${GREEN}$SCRIPT_DIR/.logs/client.log${NC}"
echo -e "  Server:      ${GREEN}$SCRIPT_DIR/.logs/server.log${NC}"
echo -e "  Service:     ${GREEN}$SCRIPT_DIR/.logs/service.log${NC}"
echo -e "  Facilitator: ${GREEN}$SCRIPT_DIR/.logs/facilitator.log${NC}\n"

echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for any process to exit
wait
