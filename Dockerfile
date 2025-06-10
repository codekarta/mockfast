# Runtime stage
FROM openjdk:8-jre-slim

WORKDIR /app

# Copy the built jar from build stage
COPY build/libs/*.jar app.jar

# Expose the required ports
EXPOSE 7070 7071

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"] 