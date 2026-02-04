# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build

RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN ["mvn", "-B", "-ntp", "dependency:go-offline"]

# Copy source code and build
COPY src ./src
# Use maven.test.skip=true to skip test compilation and execution
RUN ["mvn", "-B", "-ntp", "-Dmaven.test.skip=true", "clean", "package"]

# Runtime stage
FROM eclipse-temurin:21-jre
WORKDIR /app

# Create directory for NFS mount
RUN mkdir -p /nfs-data/teams/logos

# Copy the JAR from build stage
COPY --from=build /app/target/teams-service-*.jar app.jar

# Expose port
EXPOSE 8082

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
