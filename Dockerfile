# ==================================================
# Stage 1 - Build
# ==================================================

FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

COPY . .

RUN chmod +x mvnw

RUN ./mvnw clean package -DskipTests


# ==================================================
# Stage 2 - Runtime
# ==================================================

FROM eclipse-temurin:21-jre

LABEL maintainer="Debnil Sarkar"

WORKDIR /app

# Create a dedicated non-root user with a fixed UID
RUN groupadd --system --gid 10001 spring && \
    useradd --system --uid 10001 --gid 10001 spring

COPY --from=builder /app/target/*.jar app.jar

RUN chown 10001:10001 app.jar

# Run application as numeric non-root UID
USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]