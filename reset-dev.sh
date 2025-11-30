#!/usr/bin/env bash
set -euo pipefail

# reset-dev.sh - WSL helper to clean local dev environment for kind/docker
#
# Behavior:
# - by default deletes kind clusters whose names start with 'rn-' or 'dev-'
# - pass --all to delete all kind clusters
# - removes local images used by this project (realtime-notifications:local and myregistry/...) if present
# - optional docker system prune (asks for confirmation)
#
# Usage:
#   ./reset-dev.sh          # delete rn-/dev- clusters
#   ./reset-dev.sh --all    # delete all kind clusters

DELETE_ALL=false
if [ "${1:-}" = "--all" ]; then
  DELETE_ALL=true
fi

echo "This will delete kind clusters (default: names starting with 'rn-' or 'dev-') and remove local images." 
read -r -p "Type YES to continue (destructive): " CONFIRM
if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted by user.";
  exit 0
fi

command -v docker >/dev/null 2>&1 || { echo >&2 "docker is required but not found in PATH. Aborting."; exit 1; }
command -v kind >/dev/null 2>&1 || { echo >&2 "kind is required but not found in PATH. Aborting."; exit 1; }

echo "\n[1/4] Listing kind clusters..."
clusters=$(kind get clusters || true)
if [ -z "$clusters" ]; then
  echo "No kind clusters found."
else
  echo "Found clusters:"; echo "$clusters"
  if [ "$DELETE_ALL" = true ]; then
    echo "Deleting all clusters..."
    while IFS= read -r c; do
      [ -z "$c" ] && continue
      echo "Deleting cluster: $c"
      kind delete cluster --name "$c" || true
    done <<< "$clusters"
  else
    echo "Deleting clusters with prefix 'rn-' or 'dev-'..."
    matches=$(echo "$clusters" | grep -E '^rn-|^dev-' || true)
    if [ -z "$matches" ]; then
      echo "No matching clusters found (rn-*/dev-*). Use --all to delete all clusters.";
    else
      while IFS= read -r c; do
        [ -z "$c" ] && continue
        echo "Deleting cluster: $c"
        kind delete cluster --name "$c" || true
      done <<< "$matches"
    fi
  fi
fi

echo "\n[2/4] Removing local Docker images used by the project..."
images=("realtime-notifications:local" "myregistry/realtime-notifications:latest")
for img in "${images[@]}"; do
  id=$(docker images -q "$img" || true)
  if [ -n "$id" ]; then
    echo "Removing image $img ($id)"
    docker image rm -f "$img" || true
  else
    echo "Image $img not found, skipping."
  fi
done

# Also remove any images with repo 'realtime-notifications' (unversioned)
extra_ids=$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | awk '/realtime-notifications/ {print $2}' || true)
if [ -n "$extra_ids" ]; then
  echo "Removing additional realtime-notifications images: $extra_ids"
  for id in $extra_ids; do docker rmi -f "$id" || true; done
fi

echo "\n[3/4] Optional Docker prune"
read -r -p "Run 'docker system prune -a --volumes -f'? Type PRUNE to proceed: " PRUNE
if [ "$PRUNE" = "PRUNE" ]; then
  echo "Running docker system prune..."
  docker system prune -a --volumes -f || true
else
  echo "Skipping docker prune."
fi

echo "\n[4/4] Done. Suggestions:" 
echo " - Start Docker Desktop if it was stopped."
echo " - In WSL, run: ./dev-up.sh to rebuild/load images and apply manifests."

exit 0
