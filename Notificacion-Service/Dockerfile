# Multi-stage build for Notificacion-Service (Java 21 + Spring Boot)

# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Leverage Docker layer caching
COPY pom.xml .
RUN mvn -q -e -DskipTests dependency:go-offline

# Copy source and build
COPY src ./src
RUN mvn -q -e clean package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

# Copy artifacts
COPY --from=build /app/target/*.jar /app/app.jar

# Expose the service port (matches server.port default 8081)
EXPOSE 8081

# Healthcheck (application exposes /actuator/health)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8081/actuator/health | grep '"status":"UP"' || exit 1

# Entrypoint: start app (Flyway will apply V5__fix_template.sql)
ENTRYPOINT ["java", "-jar", "app.jar"]
