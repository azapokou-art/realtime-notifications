#!/usr/bin/env pwsh

Write-Host "INICIANDO DEPLOY DO SISTEMA DE NOTIFICAÇÕES" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Yellow

Write-Host "Criando namespace..." -ForegroundColor Cyan
kubectl apply -f namespace.yaml

Write-Host "Aplicando secrets..." -ForegroundColor Cyan
kubectl apply -f secrets.yaml

Write-Host "Aplicando persistent volumes..." -ForegroundColor Cyan
kubectl apply -f mongodb-pvc.yaml
kubectl apply -f redis-pvc.yaml

Write-Host "Aplicando databases..." -ForegroundColor Cyan
kubectl apply -f mongodb-deployment.yaml
kubectl apply -f mongodb-service.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f redis-service.yaml

Write-Host "Aguardando databases ficarem prontas..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=mongodb --timeout=300s -n notification-system
kubectl wait --for=condition=ready pod -l app=redis --timeout=300s -n notification-system

Write-Host "Aplicando configurações..." -ForegroundColor Cyan
kubectl apply -f notification-config.yaml

Write-Host "Aplicando aplicação de notificações..." -ForegroundColor Cyan
kubectl apply -f notification-app.yaml
kubectl apply -f notification-service.yaml

Write-Host "Aplicando auto-scaling..." -ForegroundColor Cyan
kubectl apply -f notification-hpa.yaml

Write-Host "DEPLOY COMPLETO! Verificando status..." -ForegroundColor Green
Write-Host "Status dos pods:" -ForegroundColor Yellow
kubectl get pods -n notification-system

Write-Host "Status dos services:" -ForegroundColor Yellow
kubectl get svc -n notification-system

Write-Host "Status do HPA:" -ForegroundColor Yellow
kubectl get hpa -n notification-system

Write-Host "DEPLOY FINALIZADO COM SUCESSO!" -ForegroundColor Green
Write-Host "Acesse a aplicação via: kubectl port-forward svc/notification-service 8080:80 -n notification-system" -ForegroundColor Cyan