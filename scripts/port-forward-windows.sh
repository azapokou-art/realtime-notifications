#!/usr/bin/env bash
set -euo pipefail

# Porta o backend (service) para 8080 e o frontend para 8081, vinculando a 0.0.0.0
# Para usar: bash scripts/port-forward-windows.sh

NAMESPACE=${NAMESPACE:-notification-system}
PIDS_FILE=".port-forward-pids"

echo "Starting port-forwards for namespace '${NAMESPACE}' (binding to 0.0.0.0)."

# Start backend port-forward
nohup kubectl -n "${NAMESPACE}" port-forward --address 0.0.0.0 svc/notification-service 8080:80 >/dev/null 2>&1 &
PF1=$!
# Start frontend port-forward
nohup kubectl -n "${NAMESPACE}" port-forward --address 0.0.0.0 svc/notification-frontend 8081:80 >/dev/null 2>&1 &
PF2=$!

echo "Port-forwards started (PIDs: ${PF1} ${PF2}). Saving to ${PIDS_FILE}"
echo "${PF1} ${PF2}" > "${PIDS_FILE}"

echo "Access the API at http://localhost:8080 and the frontend at http://localhost:8081 from Windows."

echo "To stop the port-forwards:"
echo "  kill \\$(cat ${PIDS_FILE} | awk '{print $1}') \\$(cat ${PIDS_FILE} | awk '{print $2}') || true"

exit 0
