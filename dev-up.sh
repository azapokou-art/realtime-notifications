#!/usr/bin/env bash
set -euo pipefail

# Dev helper: create a kind cluster, build backend image, load it into kind,
# apply kubernetes manifests and wait for services to become ready.
#
# Usage:
#   ./dev-up.sh            # defaults
#   CLUSTER_NAME=rn-dev IMAGE=myregistry/realtime-notifications:latest ./dev-up.sh

CLUSTER_NAME=${CLUSTER_NAME:-rn-dev}
IMAGE=${IMAGE:-realtime-notifications:local}
DOCKERFILE_PATH=${DOCKERFILE_PATH:-docker/Dockerfile}
K8S_DIR=${K8S_DIR:-kubernetes}
NAMESPACE=${NAMESPACE:-notification-system}
PORT_FORWARD=${PORT_FORWARD:-false}
PORT_FORWARD_SCRIPT=${PORT_FORWARD_SCRIPT:-"scripts/port-forward-windows.sh"}

echo "[dev-up] cluster=${CLUSTER_NAME} image=${IMAGE} k8s=${K8S_DIR} namespace=${NAMESPACE}"

command -v docker >/dev/null 2>&1 || { echo >&2 "docker is required but not installed. Aborting."; exit 1; }
command -v kind >/dev/null 2>&1 || { echo >&2 "kind is required but not installed. Aborting."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo >&2 "kubectl is required but not installed. Aborting."; exit 1; }

if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
  echo "[dev-up] kind cluster '${CLUSTER_NAME}' already exists -> skipping create"
else
  echo "[dev-up] creating kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --name "${CLUSTER_NAME}"
fi

# Ensure kubeconfig is written for this kind cluster and export it for subsequent kubectl calls
# We write to the user's ~/.kube/config so other shells can pick it up too.
KUBECONFIG_FILE=${KUBECONFIG_FILE:-"${HOME}/.kube/config"}
mkdir -p "$(dirname "${KUBECONFIG_FILE}")"
echo "[dev-up] writing kubeconfig for kind cluster '${CLUSTER_NAME}' to ${KUBECONFIG_FILE}"
kind get kubeconfig --name "${CLUSTER_NAME}" > "${KUBECONFIG_FILE}"
export KUBECONFIG="${KUBECONFIG_FILE}"
echo "[dev-up] exported KUBECONFIG=${KUBECONFIG_FILE} (this export is for the duration of this script; to persist it add 'export KUBECONFIG=~/.kube/config' to your shell rc)"

echo "[dev-up] building Docker image ${IMAGE} using ${DOCKERFILE_PATH}"
docker build -t "${IMAGE}" -f "${DOCKERFILE_PATH}" .

echo "[dev-up] loading image into kind cluster '${CLUSTER_NAME}'"
kind load docker-image "${IMAGE}" --name "${CLUSTER_NAME}"

echo "[dev-up] applying kubernetes manifests (in order)"

kubectl apply -f "${K8S_DIR}/namespace.yaml"

# Secrets (if present)
if [ -f "${K8S_DIR}/secrets.yaml" ]; then
  kubectl apply -f "${K8S_DIR}/secrets.yaml"
else
  echo "[dev-up] warning: secrets.yaml not found; continuing"
fi

# Storage class / PVs / PVCs
# Apply storageclass only if it does not already exist (provisioner/volumeBindingMode are immutable)
if [ -f "${K8S_DIR}/storageclass.yaml" ]; then
  if kubectl get storageclass standard >/dev/null 2>&1; then
    echo "[dev-up] storageclass 'standard' already exists -> skipping apply to avoid immutable field errors"
  else
    kubectl apply -f "${K8S_DIR}/storageclass.yaml" || true
  fi
fi

for f in local-pv.yaml mongodb-pv-fixed.yaml novo-pv.yaml; do
  if [ -f "${K8S_DIR}/$f" ]; then
    kubectl apply -f "${K8S_DIR}/$f" || true
  fi
done

kubectl apply -f "${K8S_DIR}/mongodb-pvc.yaml" || true
kubectl apply -f "${K8S_DIR}/redis-pvc.yaml" || true

# Databases
kubectl apply -f "${K8S_DIR}/mongodb-deployment.yaml"
kubectl apply -f "${K8S_DIR}/mongodb-service.yaml"
kubectl apply -f "${K8S_DIR}/redis-deployment.yaml"
kubectl apply -f "${K8S_DIR}/redis-service.yaml"

echo "[dev-up] waiting for mongodb and redis pods to be ready (timeout 60s)"
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=60s -n "${NAMESPACE}" || true
kubectl wait --for=condition=ready pod -l app=redis --timeout=60s -n "${NAMESPACE}" || true

# Configs and application
kubectl apply -f "${K8S_DIR}/notification-config.yaml"
kubectl apply -f "${K8S_DIR}/notification-app.yaml"
kubectl apply -f "${K8S_DIR}/notification-service.yaml"

# Optional extras (HPA, frontend, networkpolicies)
for f in notification-hpa.yaml frontend-configmap.yaml frontend-deployment.yaml network-policies.yaml pod-security-standards.yaml; do
  if [ -f "${K8S_DIR}/$f" ]; then
    kubectl apply -f "${K8S_DIR}/$f" || true
  fi
done

echo "[dev-up] waiting for notification-app deployment to become available (timeout 180s)"
kubectl wait --for=condition=available deployment/notification-app --timeout=180s -n "${NAMESPACE}" || true

echo ""
echo "[dev-up] Done. Quick checks:"
echo "  kubectl -n ${NAMESPACE} get pods"
echo "  kubectl -n ${NAMESPACE} get svc"
echo ""
echo "To access the API locally run (port-forward):"
echo "  kubectl port-forward svc/notification-service 8080:80 -n ${NAMESPACE}"
echo "To access the frontend (if deployed via ConfigMap/nginx):"
echo "  kubectl port-forward svc/notification-frontend 8081:80 -n ${NAMESPACE}"

if [ "${PORT_FORWARD}" = "true" ]; then
  echo "[dev-up] PORT_FORWARD=true -> starting ${PORT_FORWARD_SCRIPT} to expose services to Windows"
  if [ -f "${PORT_FORWARD_SCRIPT}" ]; then
    # run the helper; it backgrounds kubectl port-forward and stores PIDs
    bash "${PORT_FORWARD_SCRIPT}" || echo "[dev-up] warning: failed to launch ${PORT_FORWARD_SCRIPT}"
    echo "[dev-up] port-forward helper started (check .port-forward-pids in repo root)"
  else
    echo "[dev-up] error: ${PORT_FORWARD_SCRIPT} not found; skipping port-forward"
  fi
else
  echo "[dev-up] PORT_FORWARD not enabled (set PORT_FORWARD=true to auto-start port-forwards)"
fi

echo "[dev-up] finished"
