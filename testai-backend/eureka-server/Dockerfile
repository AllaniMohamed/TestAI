# ==========================================
# Stage 1: Build with Maven
# ==========================================
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom.xml first to leverage Docker cache
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# ==========================================
# Stage 2: Runtime with JRE only
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose the service port
EXPOSE 8761

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]