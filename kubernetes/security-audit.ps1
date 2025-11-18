Write-Host "AUDITORIA DE SEGURANCA KUBERNETES - NOTIFICATION SYSTEM" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Yellow

Write-Host "Verificando Network Policies..." -ForegroundColor Cyan
kubectl get networkpolicies -n notification-system

Write-Host "Verificando Pod Security Contexts..." -ForegroundColor Cyan
kubectl get pods -n notification-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext.runAsNonRoot}{"\t"}{.spec.securityContext.runAsUser}{"\n"}{end}'

Write-Host "Verificando Container Security Contexts..." -ForegroundColor Cyan
kubectl get pods -n notification-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].securityContext.allowPrivilegeEscalation}{"\t"}{.spec.containers[*].securityContext.readOnlyRootFilesystem}{"\n"}{end}'

Write-Host "Verificando Secrets..." -ForegroundColor Cyan
kubectl get secrets -n notification-system

Write-Host "Verificando Service Accounts..." -ForegroundColor Cyan
kubectl get serviceaccounts -n notification-system

Write-Host "Verificando RBAC..." -ForegroundColor Cyan
kubectl get roles,rolebindings -n notification-system

Write-Host "Verificando Resource Limits..." -ForegroundColor Cyan
kubectl get pods -n notification-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources.requests.cpu}{"\t"}{.spec.containers[*].resources.limits.cpu}{"\n"}{end}'

Write-Host "AUDITORIA CONCLUIDA" -ForegroundColor Green