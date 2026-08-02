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

# Create non-root user
RUN addgroup --system spring && \
    adduser --system spring --ingroup spring

COPY --from=builder /app/target/*.jar app.jar

RUN chown spring:spring app.jar

USER spring

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java","-jar","app.jar"]