# Smoke test for teams-service Docker image
# Usage: powershell -ExecutionPolicy Bypass -File ./scripts/docker-smoke-test.ps1

param(
    [int]$TimeoutSeconds = 90
)

$imageName = 'teams-service-local:smoke'
$containerName = 'teams-service-smoke'

Write-Host "Building Docker image $imageName..."
docker build -t $imageName .
if ($LASTEXITCODE -ne 0) { Write-Error "Docker build failed"; exit 1 }

Write-Host "Removing any existing container named $containerName..."
docker rm -f $containerName 2>$null | Out-Null

Write-Host "Running container $containerName..."
$envs = @(
    "-e DB_HOST=host.docker.internal",
    "-e DB_PORT=5432",
    "-e DB_NAME=proyectos_dev",
    "-e DB_USERNAME=dev_user",
    "-e DB_PASSWORD=Dev2025!",
    "-e JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970",
    "-e RABBITMQ_HOST=host.docker.internal",
    "-e RABBITMQ_PORT=5672",
    "-e RABBITMQ_USERNAME=guest",
    "-e RABBITMQ_PASSWORD=guest"
)
$envArgs = $envs -join ' '

$runCmd = "docker run -d --name $containerName $envArgs -p 8082:8082 $imageName"
Write-Host $runCmd
Invoke-Expression $runCmd
if ($LASTEXITCODE -ne 0) { Write-Error "docker run failed"; exit 1 }

$start = Get-Date
$deadline = $start.AddSeconds($TimeoutSeconds)
$ok = $false

Write-Host "Waiting for /actuator/health on http://localhost:8082 (timeout: $TimeoutSeconds s)"
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-RestMethod -Uri http://localhost:8082/actuator/health -UseBasicParsing -TimeoutSec 5
        if ($r.status -eq 'UP') { $ok = $true; break }
    } catch {
        Start-Sleep -Seconds 2
    }
}

Write-Host "Container logs (last 200 lines):"
docker logs --tail 200 $containerName

if ($ok) {
    Write-Host "SMOKE TEST PASSED: /actuator/health returned UP"
    exit 0
} else {
    Write-Error "SMOKE TEST FAILED: /actuator/health did not return UP within $TimeoutSeconds seconds"
    exit 2
}
