# Task Dashboard — Cloud-Native CI/CD & GitOps

A production-style DevOps project demonstrating an end-to-end workflow for building, securing, containerizing, and deploying a Spring Boot application on Kubernetes using GitHub Actions and ArgoCD.

The application itself is intentionally simple; the primary focus of this project is the **DevOps delivery platform** around it.

---

## Architecture

```text
Developer
   |
   | git push
   v
Application GitHub Repository
   |
   v
GitHub Actions
   |
   +--> Trivy filesystem scan
   |
   +--> Docker multi-stage build
   |
   +--> Trivy container image scan
   |
   +--> Docker Hub
   |
   +--> Update GitOps repository with Git SHA
                |
                v
        GitOps Repository
                |
                v
             ArgoCD
                |
                v
          Kubernetes Cluster
                |
        +-------+-------+
        |               |
      Pod 1           Pod 2
        |               |
        +-------+-------+
                |
         Spring Boot App
                |
                v
         External MySQL
```

---

## Project Objectives

- Containerize a Spring Boot application using Docker.
- Use a multi-stage Docker build to separate build and runtime environments.
- Run the application as a non-root container user.
- Build a CI pipeline with GitHub Actions.
- Integrate Trivy for filesystem and container image vulnerability scanning.
- Build and publish versioned Docker images to Docker Hub.
- Use Git SHA tags for immutable image versioning and traceability.
- Deploy the application to Kubernetes.
- Use Kubernetes ConfigMaps and Secrets for externalized configuration.
- Implement rolling updates, health probes, resource requests/limits, and HPA.
- Use Ingress for HTTP routing.
- Implement GitOps using ArgoCD.
- Automatically update the GitOps repository when a new image is built.

---

## Technology Stack

| Area | Technology |
|---|---|
| Application | Java, Spring Boot |
| Database | MySQL |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| Security | Trivy |
| Container Registry | Docker Hub |
| Orchestration | Kubernetes |
| GitOps | ArgoCD |
| Configuration | ConfigMap / Secret |
| Scaling | Kubernetes HPA |
| Traffic | Kubernetes Service / Ingress |

---

## Repository Structure

### Application Repository

```text
task-dashboard/
├── src/
├── pom.xml
├── mvnw
├── Dockerfile
├── .dockerignore
├── docker/
│   └── docker-compose.yml
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
└── .github/
    └── workflows/
        └── ci.yml
```

### GitOps Repository

```text
task-dashboard-gitops/
└── k8s/
    ├── namespace.yaml
    ├── configmap.yaml
    ├── secret.yaml
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── hpa.yaml
```

The application repository contains the source code and CI pipeline. The GitOps repository contains the desired Kubernetes state consumed by ArgoCD.

---

# 1. Local Development

## Run MySQL

MySQL is used as an external dependency for the Kubernetes deployment and can be run locally with Docker Compose.

```bash
cd docker
docker compose up -d
```

Verify:

```bash
docker ps
```

The application receives database configuration through environment variables:

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
```

---

# 2. Build the Docker Image

The Dockerfile uses a multi-stage build.

### Build stage

```text
Source Code
    |
    v
JDK 21
    |
    v
Maven Build
    |
    v
JAR
```

### Runtime stage

```text
JRE 21
    |
    v
JAR
    |
    v
Non-root container
```

Build:

```bash
docker build -t task-dashboard:latest .
```

Run locally using the appropriate database environment variables:

```bash
docker run --rm \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=<database-url> \
  -e SPRING_DATASOURCE_USERNAME=<username> \
  -e SPRING_DATASOURCE_PASSWORD=<password> \
  task-dashboard:latest
```

---

# 3. Docker Security

The runtime image runs as a dedicated non-root UID:

```text
10001
```

The Kubernetes Deployment reinforces this with:

```yaml
runAsUser: 10001
runAsGroup: 10001
runAsNonRoot: true
allowPrivilegeEscalation: false
```

All Linux capabilities are dropped:

```yaml
capabilities:
  drop:
    - ALL
```

This follows the principle of least privilege.

---

# 4. GitHub Actions CI/CD

The pipeline is triggered by pushes and pull requests targeting `main`.

High-level flow:

```text
Git Push
   |
   v
Checkout
   |
   v
Trivy Filesystem Scan
   |
   v
Docker Build
   |
   v
Trivy Image Scan
   |
   v
Docker Hub Login
   |
   v
Push Image
   |
   v
Update GitOps Repository
```

The image is tagged using the Git commit SHA:

```text
<dockerhub-user>/task-dashboard:<git-sha>
```

This provides immutable image identification and makes rollback/traceability easier than relying only on `latest`.

---

# 5. Trivy Security Scanning

Two scanning stages are used.

## Filesystem Scan

Scans the repository before container publication.

Purpose:

- Detect vulnerable dependencies.
- Identify security issues in the project filesystem.
- Shift security checks earlier in the CI pipeline.

## Image Scan

Scans the built Docker image.

Purpose:

- Detect OS package vulnerabilities.
- Detect vulnerabilities in runtime dependencies.
- Prevent an image from being blindly published without security visibility.

The pipeline can later be configured to fail on selected vulnerability severities according to the organization's security policy.

---

# 6. Kubernetes Deployment

The Kubernetes workload is intentionally limited to the **stateless Spring Boot application**.

MySQL is kept outside Kubernetes because production environments commonly use a managed or separately operated database service rather than running the database as an application pod.

## Namespace

```yaml
task-dashboard
```

## Deployment

The application runs with:

```text
2 replicas
```

This allows:

- High availability at the application layer.
- Rolling updates.
- Kubernetes self-healing.
- Service-level load balancing.

The Deployment uses:

```text
RollingUpdate
maxUnavailable: 0
maxSurge: 1
```

---

# 7. Configuration Management

Non-sensitive configuration is stored in a ConfigMap.

Example:

```text
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
```

Sensitive configuration is provided through a Kubernetes Secret:

```text
SPRING_DATASOURCE_PASSWORD
```

The Docker image therefore remains environment-independent.

> Do not commit real production credentials to Git. For a production implementation, use a dedicated secrets-management solution such as AWS Secrets Manager with an appropriate Kubernetes integration.

---

# 8. Kubernetes Health Checks

The Deployment uses three probes.

### Startup Probe

Protects slow-starting applications from being restarted before startup completes.

### Readiness Probe

Determines whether the pod is ready to receive traffic.

### Liveness Probe

Determines whether Kubernetes should restart an unhealthy application container.

Flow:

```text
Pod starts
   |
   v
Startup Probe
   |
   v
Readiness Probe
   |
   +---- Ready ----> Service sends traffic
   |
   v
Liveness Probe
   |
   +---- Failure ----> Container restarted
```

---

# 9. Resource Management

The application defines resource requests:

```yaml
requests:
  cpu: 250m
  memory: 256Mi
```

and limits:

```yaml
limits:
  cpu: 500m
  memory: 512Mi
```

Requests help Kubernetes schedule the workload appropriately.

Limits provide an upper boundary for resource consumption.

---

# 10. Horizontal Pod Autoscaling

HPA is configured using CPU utilization.

```text
Minimum replicas: 2
Maximum replicas: 5
Target CPU: 70%
```

Conceptually:

```text
Normal load
    |
    v
2 replicas

Higher CPU
    |
    v
3 → 4 → 5 replicas

Lower load
    |
    v
5 → 4 → 3 → 2 replicas
```

HPA requires the Kubernetes Metrics API/Metrics Server to be available.

---

# 11. Service

The application is exposed internally using a `ClusterIP` Service.

```text
Service :80
     |
     +----> Pod :8080
     |
     +----> Pod :8080
```

The Service provides stable service discovery and distributes traffic across matching pods.

---

# 12. Ingress

HTTP traffic is routed through Kubernetes Ingress:

```text
Client
  |
  v
Ingress
  |
  v
ClusterIP Service
  |
  +----> Pod 1
  |
  +----> Pod 2
```

The exact external IP/hostname depends on the Ingress Controller and Kubernetes environment.

---

# 13. GitOps with ArgoCD

ArgoCD watches the GitOps repository.

Instead of manually running:

```bash
kubectl apply
```

for every deployment change:

```text
New application image
       |
       v
GitHub Actions
       |
       v
GitOps repository updated
       |
       v
ArgoCD detects Git change
       |
       v
Kubernetes synchronized
```

ArgoCD continuously reconciles the desired state stored in Git with the actual Kubernetes state.

This provides:

- Git as the source of truth.
- Automated synchronization.
- Drift detection.
- Self-healing.
- Auditable deployment history.

---

# 14. Deployment Traceability

A deployment can be traced end-to-end:

```text
Git Commit
    |
    v
GitHub Actions
    |
    v
Docker Image
<commit-sha>
    |
    v
GitOps Commit
    |
    v
ArgoCD
    |
    v
Kubernetes Pod
```

This makes it possible to answer:

> Which source-code commit is currently running in Kubernetes?

---

# 15. Useful Kubernetes Commands

Check application pods:

```bash
kubectl get pods -n task-dashboard
```

Check Deployment:

```bash
kubectl get deployment -n task-dashboard
```

Check Service:

```bash
kubectl get svc -n task-dashboard
```

Check Ingress:

```bash
kubectl get ingress -n task-dashboard
```

Check HPA:

```bash
kubectl get hpa -n task-dashboard
```

Check application logs:

```bash
kubectl logs -n task-dashboard <pod-name>
```

Describe a pod:

```bash
kubectl describe pod -n task-dashboard <pod-name>
```

Check rollout:

```bash
kubectl rollout status deployment/task-dashboard -n task-dashboard
```

Check rollout history:

```bash
kubectl rollout history deployment/task-dashboard -n task-dashboard
```

Test self-healing:

```bash
kubectl delete pod <pod-name> -n task-dashboard
```

Then:

```bash
kubectl get pods -n task-dashboard
```

Kubernetes should recreate the deleted pod.

---

# 16. Interview Topics Covered

This project can be used to revise:

### Docker

- Multi-stage builds
- Build vs runtime images
- Non-root containers
- `.dockerignore`
- Image tagging
- Container networking

### GitHub Actions

- Runners
- Workflows
- Jobs and steps
- Secrets
- Docker Buildx
- Image publishing
- CI/CD pipeline design

### DevSecOps

- Shift-left security
- Trivy filesystem scanning
- Container image scanning
- Security gates
- Secrets management

### Kubernetes

- Namespace
- Deployment
- ReplicaSets
- RollingUpdate
- Service
- Ingress
- ConfigMap
- Secret
- Resource requests/limits
- Startup/readiness/liveness probes
- HPA
- Self-healing

### GitOps

- ArgoCD
- Desired vs actual state
- Drift detection
- Automated synchronization
- Self-healing
- Git as the source of truth

---

# 17. End-to-End Summary

The complete delivery process is:

```text
Developer
    |
    | git push
    v
GitHub Application Repository
    |
    v
GitHub Actions
    |
    +--> Build Docker Image
    |
    +--> Trivy Filesystem Scan
    |
    +--> Trivy Image Scan
    |
    +--> Push Image to Docker Hub
    |
    +--> Update GitOps Repository
                    |
                    v
             ArgoCD detects change
                    |
                    v
              Kubernetes sync
                    |
            +-------+-------+
            |               |
          Pod 1           Pod 2
            |               |
            +-------+-------+
                    |
                    v
              Spring Boot
                    |
                    v
              External MySQL
```

---

## Future Improvements

Possible production extensions:

- AWS EKS deployment using Terraform.
- AWS Secrets Manager + External Secrets Operator.
- Amazon ECR instead of Docker Hub.
- Prometheus and Grafana monitoring.
- Alertmanager.
- TLS/HTTPS with cert-manager.
- NetworkPolicies.
- SonarQube quality gates.
- SBOM generation.
- Image signing with Cosign.
- Helm chart packaging.
- Separate dev/staging/prod GitOps environments.

---

## Project Takeaway

The main goal of this project is not the Spring Boot application itself.

The application acts as a realistic workload for demonstrating an end-to-end **containerized, security-aware, Kubernetes and GitOps delivery workflow**.

