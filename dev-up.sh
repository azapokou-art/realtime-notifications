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

echo "[dev-up] waiting for mongodb and redis pods to be ready (timeout 300s)"
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=300s -n "${NAMESPACE}" || true
kubectl wait --for=condition=ready pod -l app=redis --timeout=300s -n "${NAMESPACE}" || true

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

echo "[dev-up] finished"
