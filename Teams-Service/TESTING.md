# Teams Service - Testing Guide

## Postman Collection Examples

### 1. Create Team (with logo)

**Request:**
```
POST http://localhost:8082/api/teams
Headers:
  Authorization: Bearer <your-jwt-token>
  Content-Type: multipart/form-data

Body (form-data):
  team: {
    "name": "Barcelona FC",
    "description": "Professional soccer team from Barcelona"
  }
  logo: [file] team-logo.png
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Barcelona FC",
  "description": "Professional soccer team from Barcelona",
  "logoUrl": "teams/logos/1/1-20251209103045.png",
  "ownerUserId": 123,
  "createdAt": "2025-12-09T10:30:45",
  "updatedAt": "2025-12-09T10:30:45"
}
```

### 2. Get All User Teams

**Request:**
```
GET http://localhost:8082/api/teams
Headers:
  Authorization: Bearer <your-jwt-token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Barcelona FC",
    "description": "Professional soccer team from Barcelona",
    "logoUrl": "teams/logos/1/1-20251209103045.png",
    "ownerUserId": 123,
    "createdAt": "2025-12-09T10:30:45",
    "updatedAt": "2025-12-09T10:30:45"
  },
  {
    "id": 2,
    "name": "Real Madrid",
    "description": "Professional soccer team from Madrid",
    "logoUrl": null,
    "ownerUserId": 123,
    "createdAt": "2025-12-09T11:15:20",
    "updatedAt": "2025-12-09T11:15:20"
  }
]
```

### 3. Get Specific Team

**Request:**
```
GET http://localhost:8082/api/teams/1
Headers:
  Authorization: Bearer <your-jwt-token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Barcelona FC",
  "description": "Professional soccer team from Barcelona",
  "logoUrl": "teams/logos/1/1-20251209103045.png",
  "ownerUserId": 123,
  "createdAt": "2025-12-09T10:30:45",
  "updatedAt": "2025-12-09T10:30:45"
}
```

### 4. Update Team

**Request:**
```
PUT http://localhost:8082/api/teams/1
Headers:
  Authorization: Bearer <your-jwt-token>
  Content-Type: multipart/form-data

Body (form-data):
  team: {
    "name": "FC Barcelona",
    "description": "Updated description"
  }
  logo: [file] new-logo.png  (optional)
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "FC Barcelona",
  "description": "Updated description",
  "logoUrl": "teams/logos/1/1-20251209120530.png",
  "ownerUserId": 123,
  "createdAt": "2025-12-09T10:30:45",
  "updatedAt": "2025-12-09T12:05:30"
}
```

### 5. Delete Team

**Request:**
```
DELETE http://localhost:8082/api/teams/1
Headers:
  Authorization: Bearer <your-jwt-token>
```

**Response (204 No Content):**
```
(empty response)
```

## Error Responses

### 401 Unauthorized (Missing or Invalid JWT)
```json
{
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource"
}
```

### 404 Not Found (Team doesn't exist)
```json
{
  "status": 404,
  "message": "Team not found with id: 999",
  "timestamp": "2025-12-09T10:30:00",
  "path": "/api/teams/999"
}
```

### 409 Conflict (Duplicate team name)
```json
{
  "status": 409,
  "message": "Team with name 'Barcelona FC' already exists",
  "timestamp": "2025-12-09T10:30:00",
  "path": "/api/teams"
}
```

### 400 Bad Request (Validation error)
```json
{
  "status": 400,
  "message": "Validation failed",
  "timestamp": "2025-12-09T10:30:00",
  "path": "/api/teams",
  "errors": {
    "name": "Team name is required",
    "description": "Description must not exceed 500 characters"
  }
}
```

### 400 Bad Request (Invalid file)
```json
{
  "status": 400,
  "message": "File type not allowed. Allowed types: jpg,jpeg,png",
  "timestamp": "2025-12-09T10:30:00",
  "path": "/api/teams"
}
```

## PowerShell Testing Commands

### Using Invoke-RestMethod

```powershell
# Set your JWT token
$token = "your-jwt-token-here"
$headers = @{
    "Authorization" = "Bearer $token"
}

# Create team without logo
$teamData = @{
    name = "Barcelona FC"
    description = "Professional soccer team"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8082/api/teams" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $teamData

# Get all teams
Invoke-RestMethod -Uri "http://localhost:8082/api/teams" `
    -Method Get `
    -Headers $headers

# Get specific team
Invoke-RestMethod -Uri "http://localhost:8082/api/teams/1" `
    -Method Get `
    -Headers $headers

# Delete team
Invoke-RestMethod -Uri "http://localhost:8082/api/teams/1" `
    -Method Delete `
    -Headers $headers
```

### Create Team with Logo (PowerShell)

```powershell
$token = "your-jwt-token-here"
$uri = "http://localhost:8082/api/teams"

# Prepare multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    'Content-Disposition: form-data; name="team"',
    'Content-Type: application/json',
    '',
    '{"name":"Barcelona FC","description":"Professional soccer team"}',
    "--$boundary",
    'Content-Disposition: form-data; name="logo"; filename="logo.png"',
    'Content-Type: image/png',
    '',
    [System.IO.File]::ReadAllText("C:\path\to\logo.png"),
    "--$boundary--"
) -join $LF

Invoke-RestMethod -Uri $uri `
    -Method Post `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    } `
    -Body $bodyLines
```

## Obtaining JWT Token

You need to authenticate with the auth-service first to get a JWT token:

```powershell
# Login to auth-service
$loginData = @{
    email = "user@example.com"
    password = "yourpassword"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginData

# Extract token
$token = $response.token

# Use this token in subsequent requests to teams-service
```

## Testing RabbitMQ Events

### View RabbitMQ Management Console

1. Open browser: `http://localhost:15672`
2. Login: `guest` / `guest`
3. Navigate to **Queues** tab
4. Check queues:
   - `team.created.queue`
   - `team.updated.queue`
   - `team.deleted.queue`

### Consume Messages

```powershell
# Install RabbitMQ management plugin tools or use management UI
# Messages will appear in the queues when teams are created/updated/deleted
```

## Testing NFS Storage

### Verify Logo Upload

```powershell
# List files in NFS container
docker exec -it nfs-server-dev ls -la /nfs-data/teams/logos/

# View files for specific team
docker exec -it nfs-server-dev ls -la /nfs-data/teams/logos/1/

# Copy logo from NFS to local machine
docker cp nfs-server-dev:/nfs-data/teams/logos/1/1-20251209103045.png ./downloaded-logo.png
```

## Integration Testing

Run integration tests with Maven:

```powershell
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=TeamServiceTest

# Run tests with coverage
mvn verify

# Skip tests during build
mvn clean package -DskipTests
```

## Health Check

```powershell
# Check if service is running
Invoke-RestMethod -Uri "http://localhost:8082/actuator/health"
```

Add to `pom.xml` for actuator endpoints:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Add to `application.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info
```
