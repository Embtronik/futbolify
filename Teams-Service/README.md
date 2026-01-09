# Teams Service

Backend service for managing soccer teams and groups. Built with Spring Boot, this microservice handles team/group registration, metadata management, and logo file storage.

## Features

- ✅ CRUD operations for soccer teams/groups
- ✅ JWT-based authentication (integrated with auth-service)
- ✅ **Team membership system with 6-digit join codes**
- ✅ **Pending/Approved/Rejected membership workflow**
- ✅ Logo file storage via NFS server
- ✅ Event-driven architecture with RabbitMQ
- ✅ PostgreSQL database for persistence
- ✅ Docker containerization

## Tech Stack

- **Java 17**
- **Spring Boot 3.2**
- **Spring Security** with JWT
- **Spring Data JPA** with Hibernate
- **PostgreSQL** for database
- **RabbitMQ** for messaging
- **NFS** for file storage
- **MapStruct** for DTO mapping
- **Lombok** for code reduction
- **Maven** for build management

## Architecture

This service is part of a microservices ecosystem:

- **Teams-Service** (this): Manages teams/groups and file storage
- **Auth-Service**: Handles authentication and JWT token generation
- **Notification-Service**: Processes events from RabbitMQ

### Data Flow

1. User authenticates via auth-service → receives JWT token
2. Team creation request with JWT → Teams-Service validates token & generates unique 6-digit code
3. Team metadata → PostgreSQL, Logo file → NFS mount at `/nfs-data`
4. Other users can join team using the 6-digit code → Membership request created (PENDING)
5. Team owner approves/rejects requests → User becomes active member (APPROVED)
6. Success event → RabbitMQ → notification-service

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- Docker and Docker Compose (for infrastructure)

## Quick Start

### 1. Clone the repository

```powershell
git clone <repository-url>
cd Teams-Service
```

### 2. Start infrastructure services

```powershell
# Start PostgreSQL, RabbitMQ, and NFS server
docker-compose up -d postgres rabbitmq nfs-server
```

### 3. Configure environment variables

```powershell
# Copy example env file
cp .env.example .env

# Or set environment variables manually
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_NAME="proyectos_dev"
$env:DB_USERNAME="dev_user"
$env:DB_PASSWORD="Dev2025!"
$env:JWT_SECRET="404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
```

### 4. Build and run the service

```powershell
# Build the project
mvn clean package

# Run the application
mvn spring-boot:run

# Or run the JAR directly
java -jar target/teams-service-0.0.1-SNAPSHOT.jar
```

The service will start on `http://localhost:8082`

## Docker Deployment

### Build and run everything with Docker Compose

```powershell
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f teams-service

# Stop services
docker-compose down
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Teams Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams` | Create a new team (with optional logo, generates join code) |
| GET | `/api/teams` | Get all teams for authenticated user |
| GET | `/api/teams/{id}` | Get specific team by ID |
| PUT | `/api/teams/{id}` | Update team (with optional logo) |
| DELETE | `/api/teams/{id}` | Delete team |

### Team Membership (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams/join` | Request to join a team using 6-digit code |
| GET | `/api/teams/{id}/pending-requests` | Get pending membership requests (owner only) |
| PUT | `/api/teams/{id}/members/{memberId}` | Approve/reject membership request (owner only) |
| GET | `/api/teams/{id}/members` | Get approved team members |
| GET | `/api/teams/my-memberships` | Get teams user belongs to |

📖 **Detailed membership documentation:** See [MEMBERSHIP.md](MEMBERSHIP.md)

### Example: Create Team

```bash
curl -X POST http://localhost:8082/api/teams \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "team={\"name\":\"Barcelona FC\",\"description\":\"Professional soccer team\"};type=application/json" \
  -F "logo=@/path/to/logo.png"

# Response includes joinCode:
# {
#   "id": 1,
#   "name": "Barcelona FC",
#   "joinCode": "ABC123",  <-- Share this with users
#   "memberCount": 0,
#   ...
# }
```

### Example: Join Team (NEW)

```bash
curl -X POST http://localhost:8082/api/teams/join \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"joinCode":"ABC123"}'

# Response:
# {
#   "status": "PENDING",  <-- Waiting for owner approval
#   "teamName": "Barcelona FC",
#   ...
# }
```

### Example: Approve Member (Owner only)

```bash
curl -X PUT http://localhost:8082/api/teams/1/members/5 \
  -H "Authorization: Bearer <owner-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"approved":true}'
```

### Example: Get All Teams

```bash
curl -X GET http://localhost:8082/api/teams \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Configuration

Key configuration properties in `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:proyectos_dev}
  
app:
  jwt:
    secret: ${JWT_SECRET}
  
  nfs:
    teams-directory: /nfs-data/teams/logos
    allowed-extensions: jpg,jpeg,png
    max-file-size: 10485760  # 10MB
  
  rabbitmq:
    exchange: teams.exchange
```

## Development

### Project Structure

```
src/
├── main/
│   ├── java/com/teamsservice/
│   │   ├── config/          # Spring configurations
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── entity/          # JPA entities
│   │   ├── exception/       # Custom exceptions
│   │   ├── mapper/          # MapStruct mappers
│   │   ├── repository/      # Spring Data repositories
│   │   ├── security/        # JWT security
│   │   └── service/         # Business logic
│   └── resources/
│       └── application.yml  # Configuration
└── test/                    # Unit and integration tests
```

### Running Tests

```powershell
# Run all tests
mvn test

# Run with coverage
mvn verify
```

### Database Schema

The `teams` table structure:

- `id` - Primary key
- `name` - Team name (required, 3-100 chars)
- `description` - Team description (optional, max 500 chars)
- `logo_path` - Path to logo file in NFS
- `join_code` - **Unique 6-digit alphanumeric code** (auto-generated)
- `owner_user_id` - Foreign key to user (from auth-service)
- `created_at` - Timestamp
- `updated_at` - Timestamp

The `team_members` table structure (NEW):

- `id` - Primary key
- `team_id` - Foreign key to teams
- `user_id` - User ID from auth-service
- `user_email` - User email for display
- `status` - PENDING, APPROVED, or REJECTED
- `requested_at` - When user requested to join
- `approved_at` - When request was approved/rejected
- `approved_by` - User ID who approved/rejected
- `updated_at` - Timestamp

## RabbitMQ Events

The service publishes events to RabbitMQ:

- **Exchange**: `teams.exchange` (topic)
- **Events**:
  - `team.created` - When a team is created
  - `team.updated` - When a team is updated
  - `team.deleted` - When a team is deleted

Event payload:
```json
{
  "teamId": 1,
  "teamName": "Barcelona FC",
  "userId": 123,
  "action": "CREATED",
  "timestamp": "2025-12-09T10:30:00"
}
```

## NFS File Storage

Logo files are stored in the NFS server at `/nfs-data/teams/logos/{teamId}/`

- Supported formats: JPG, JPEG, PNG
- Max file size: 10MB
- File naming: `{teamId}-{timestamp}.{extension}`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | proyectos_dev |
| DB_USERNAME | Database user | dev_user |
| DB_PASSWORD | Database password | Dev2025! |
| JWT_SECRET | JWT secret key (must match auth-service) | - |
| RABBITMQ_HOST | RabbitMQ host | localhost |
| RABBITMQ_PORT | RabbitMQ port | 5672 |
| NFS_HOST | NFS server host | localhost |
| NFS_PORT | NFS server port | 2049 |

## Troubleshooting

### Database connection issues
```powershell
# Check if PostgreSQL is running
docker ps | grep postgres

# View PostgreSQL logs
docker-compose logs postgres
```

### RabbitMQ connection issues
```powershell
# Check RabbitMQ status
docker-compose logs rabbitmq

# Access RabbitMQ management UI
# http://localhost:15672 (guest/guest)
```

### NFS mounting issues
```powershell
# Check NFS server status
docker-compose logs nfs-server

# Verify NFS directory exists
docker exec -it nfs-server-dev ls -la /nfs-data
```

## License

[Your License Here]

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
