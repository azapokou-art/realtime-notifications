# Desenvolvimento local com kind (WSL)

Este documento descreve como levantar o cluster Kubernetes localmente usando `kind` no WSL (Windows Subsystem for Linux), construir e carregar a imagem do backend, aplicar os manifests do repositório e verificar a aplicação. Ele complementa o script de conveniência `dev-up.sh` adicionado ao repositório.

Resumo rápido
- Requisitos: Docker Desktop (com integração WSL2), kind, kubectl, bash/WSL.
- Script principal: `dev-up.sh` (na raiz do repositório) — cria o cluster, builda a imagem, carrega no kind, aplica manifests e espera readiness.

Arquivos relevantes
- `dev-up.sh` — script de automação (criar cluster, build, load, apply, wait).
- `docker/Dockerfile` — Dockerfile da aplicação backend (porta 3000).
- `kubernetes/` — manifests usados pela aplicação.

Pré-requisitos
1. Docker Desktop com WSL2 integration ativada (Settings → Resources → WSL Integration → habilitar sua distro). Isso torna o `docker` disponível dentro do WSL.
2. WSL2 (por exemplo Ubuntu). Abra a distro WSL para executar os comandos abaixo.
3. `kind` instalado na distro WSL. Instale com:

```bash
[ $(uname -m) = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.30.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```
[Documentação oficial do kind](https://kind.sigs.k8s.io/docs/user/quick-start/)

4. `kubectl` instalado na distro WSL. Instalção rápida:

```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```
[Documentação oficial do kubernets](https://kind.sigs.k8s.io/docs/user/quick-start/)

5. (Opcional) Ter `git` e `make` se for útil para seu fluxo.

Executando (passo-a-passo)

1. Abra sua distro WSL e vá para a raiz do repositório (ex.: se o repo está em C:):

```bash
cd /mnt/c/Users/{user}/Documents/realtime-notifications
```

2. Torne o script executável e execute:

```bash
chmod +x dev-up.sh
./dev-up.sh
```

Por padrão o script usa as variáveis:
- `CLUSTER_NAME` (padrão: `rn-dev`)
-- `IMAGE` (padrão: `realtime-notifications:local`) — o script builda essa imagem localmente e a carrega no cluster kind (não é necessário push para um registry remoto).

Exemplo com variáveis customizadas:

```bash
CLUSTER_NAME=rn-dev IMAGE=realtime-notifications:local ./dev-up.sh
```

O que o script faz (resumo)
- Cria um cluster kind (se não existir).
- Constrói a imagem Docker do backend usando `docker/Dockerfile`.
- Carrega a imagem no cluster kind (`kind load docker-image ...`).
- Aplica os manifests do diretório `kubernetes/` na ordem: namespace -> secrets -> storage/PV/PVC -> banco de dados -> app/service -> extras (HPA, frontend, networkpolicies).
- Aguarda readiness dos pods e do deployment `notification-app`.

Atenção a casos especiais

- StorageClass: se o cluster já tiver uma StorageClass chamada `standard` o script pula a aplicação do `kubernetes/storageclass.yaml` para evitar erros (alguns campos são imutáveis). Se quiser substituir a StorageClass atual, delete-a manualmente antes de aplicar (riscos associados).

- Secrets: o repositório contém `kubernetes/secrets.yaml` com dados em base64. Para ambientes públicos ou CI, substitua por `secrets.example.yaml` e injete segredos via SealedSecrets / SOPS / ExternalSecrets. O script por padrão aplica `secrets.yaml` se ele existir.

- HPA e métricas: o HPA do projeto usa métricas custom (`connections_per_second`). Para que métricas custom funcionem você precisa de um adapter (Prometheus Adapter) e do metrics-server instalado. Sem isso, o HPA pode não escalar corretamente.

Conectando/checando a aplicação

- Verificar pods e services:

```bash
kubectl -n notification-system get pods
kubectl -n notification-system get svc
```

- Port-forward para acessar localmente:

API (porta HTTP):
```bash
kubectl -n notification-system port-forward svc/notification-service 8080:80
# depois abra: http://localhost:8080/health
```

Frontend (se deployado via ConfigMap/nginx):
```bash
kubectl -n notification-system port-forward svc/notification-frontend 8081:80
# depois abra: http://localhost:8081/
```

Acessando a partir do Windows (WSL2)
----------------------------------

Por padrão os exemplos acima criam um port-forward ligado apenas a localhost dentro da sua sessão WSL. Para facilitar o acesso a partir do Windows (Postman, navegador, etc.) há duas opções:

1) Executar um port-forward que escute em 0.0.0.0 (recomendado para dev local):

```bash
# liga o service do backend para a porta 8080 e aceita conexões de outras interfaces
kubectl -n notification-system port-forward --address 0.0.0.0 svc/notification-service 8080:80

# frontend
kubectl -n notification-system port-forward --address 0.0.0.0 svc/notification-frontend 8081:80
```

2) Usar o helper criado no repositório que inicia ambos os port-forwards em background e grava os PIDs:

```bash
bash scripts/port-forward-windows.sh
# Acessar do Windows em:
# Backend:  http://localhost:8080
# Frontend: http://localhost:8081
```

Para parar os port-forwards iniciados pelo helper:

```bash
# dentro da raiz do repo (onde o helper gravou .port-forward-pids)
kill $(awk '{print $1}' .port-forward-pids) $(awk '{print $2}' .port-forward-pids) || true
rm -f .port-forward-pids
```

Dica: se por algum motivo `localhost` no Windows não funcionar com WSL2, descubra o IP da sua distro WSL (`wsl hostname -I`) e tente `http://<WSL_IP>:8080`.

Executar o `dev-up.sh` com port-forward automático
-------------------------------------------------

O script `dev-up.sh` agora tem suporte opcional para iniciar o helper de port-forward automaticamente. Para usá-lo:

```bash
PORT_FORWARD=true bash ./dev-up.sh
```

Ou exporte a variável no seu shell:

```bash
export PORT_FORWARD=true
./dev-up.sh
```

Observação sobre KUBECONFIG
--------------------------

O `dev-up.sh` grava o kubeconfig do cluster kind em `~/.kube/config` e exporta `KUBECONFIG` durante a execução do script para garantir que os `kubectl` subsequentes funcionem. Se quiser que a variável `KUBECONFIG` seja visível em novas shells, adicione ao seu `~/.bashrc` ou `~/.profile`:

```bash
export KUBECONFIG=~/.kube/config
```

Isso facilita usar `kubectl` a partir de novas abas/terminais sem precisar exportar novamente.


Se der problemas, cole os logs:

```bash
kubectl -n notification-system logs deployment/notification-app
kubectl -n notification-system logs pod/<nome-pod>
```

Executando o script a partir do PowerShell (opcional)

Você pode invocar o script via WSL a partir do PowerShell:

```powershell
#wsl -d Ubuntu -- bash -lc "cd /mnt/c/Users/vinip/Documents/realtime-notifications && ./dev-up.sh"
```

Limpeza

Para remover o cluster criado pelo kind:

```bash
kind delete cluster --name rn-dev
```

Reset do ambiente (WSL)

Se quiser limpar tudo e começar do zero (clusters kind, imagens e opcionalmente `docker system prune`), use o script `reset-dev.sh` criado para WSL.

Aviso: esta operação é destrutiva. Leia as mensagens e confirme quando solicitado.

Uso básico (na raiz do repositório, dentro do WSL):

```bash
chmod +x reset-dev.sh
./reset-dev.sh
```

Comportamento padrão:
- Remove clusters `kind` cujo nome começa com `rn-` ou `dev-` (seguro para não apagar clusters não relacionados).
- Remove imagens locais usadas pelo projeto (`realtime-notifications:local` e `myregistry/realtime-notifications:latest`).

Opções:
- `./reset-dev.sh --all` — deleta todos os clusters `kind` (use com cautela).
- O script pergunta explicitamente para executar `docker system prune -a --volumes -f`; digite `PRUNE` para confirmar essa etapa.

Depois do reset, reconstrua e reprovisione o cluster com:

```bash
./dev-up.sh
```

Próximos passos recomendados

1. Secrets: mover `kubernetes/secrets.yaml` para fora do repositório e adicionar `kubernetes/secrets.example.yaml` com placeholders; usar SealedSecrets/SOPS/ExternalSecrets para gerenciamento.
2. Imagem de produção: publicar a imagem em um registry e atualizar `kubernetes/notification-app.yaml` com a tag real.
3. Frontend: optar entre (a) servir via ConfigMap+nginx (atual) ou (b) criar uma imagem de frontend e publicar no registry.
4. HPA/observability: instalar `metrics-server` e `Prometheus + Prometheus Adapter` se quiser HPA baseado em métricas custom.
5. Remover/arquivar manifests obsoletos (ex.: PVs duplicados, PSP) — há recomendações no relatório de revisão.

Ajuda / problemas comuns

- `docker: command not found` dentro do WSL: verifique a integração WSL2 no Docker Desktop.
- `kind: command not found`: instale `kind` conforme instruções acima.
- Erros ao aplicar StorageClass: o script agora detecta e pula a aplicação se uma StorageClass `standard` já existir; para forçar substituição remova-a manualmente.

Contribuições

Se quiser que eu adicione um README mais completo ou altere o `dev-up.sh` (por exemplo, adicionar `--force-storageclass` ou checagens interativas), diga qual comportamento prefere que eu implemente.

---
Arquivo gerado automaticamente: `README_WSL.md`
