# Compass-Service API Specification - Critical Endpoints

## 📋 **Overview**

This document specifies the **15 critical endpoints** required by the Kubernetes controllers for Component, Metric, and Scorecard resources. These endpoints handle resource lifecycle management including import, creation, updates, retrieval, and deletion.

**Base URL:** `http://compass-service.compass.svc.cluster.local/api/v1`

---

## 🏗️ **Component Endpoints**

### **1. Get Component by ID**

**Endpoint:** `GET /api/v1/components/{id}`

**Description:** Retrieve a component by its Compass ID

**Path Parameters:**
- `id` (string, required): The Compass component ID

**Request Example:**
```bash
GET /api/v1/components/comp-12345
Accept: application/json
```

**Success Response (200):**
```json
{
  "id": "comp-12345",
  "name": "simple-service",
  "spec": {
    "name": "simple-service",
    "componentType": "service",
    "typeId": "SERVICE",
    "description": "Simple-service is a no-nonsense service",
    "tribe": "platform",
    "squad": "cloud-runtime",
    "links": [
      {
        "name": "Repository",
        "type": "REPOSITORY",
        "url": "https://github.com/motain/simple-service"
      }
    ],
    "labels": ["platform", "cloud-runtime"]
  },
  "metricAssociation": [
    {
      "metricName": "allocation-efficiency",
      "metricId": "metric-67890",
      "metricSourceId": "ms-11111"
    }
  ],
  "createdAt": "2025-06-02T10:00:00Z",
  "updatedAt": "2025-06-02T10:00:00Z"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Component with ID 'comp-12345' not found",
  "timestamp": "2025-06-02T10:00:00Z"
}

// 400 Bad Request
{
  "status_code": 400,
  "error": "INVALID_ID",
  "message": "Invalid component ID format",
  "timestamp": "2025-06-02T10:00:00Z"
}

// 500 Internal Server Error
{
  "status_code": 500,
  "error": "INTERNAL_ERROR",
  "message": "Internal server error occurred",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **2. Get Component by Name (Import)**

**Endpoint:** `GET /api/v1/components/by-name/{name}`

**Description:** Retrieve a component by its name for import functionality

**Path Parameters:**
- `name` (string, required): The component name

**Request Example:**
```bash
GET /api/v1/components/by-name/simple-service
Accept: application/json
```

**Success Response (200):**
```json
{
  "id": "comp-12345",
  "name": "simple-service",
  "spec": {
    "name": "simple-service",
    "componentType": "service",
    "typeId": "SERVICE",
    "description": "Simple-service is a no-nonsense service",
    "tribe": "platform",
    "squad": "cloud-runtime"
  },
  "metricAssociation": [
    {
      "metricName": "allocation-efficiency",
      "metricId": "metric-67890",
      "metricSourceId": "ms-11111"
    }
  ]
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Component with name 'simple-service' not found",
  "timestamp": "2025-06-02T10:00:00Z"
}

// 400 Bad Request
{
  "status_code": 400,
  "error": "INVALID_NAME",
  "message": "Invalid component name format",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **3. Create Component**

**Endpoint:** `POST /api/v1/components`

**Description:** Create a new component with optional metric associations

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "component": {
    "metadata": {
      "name": "simple-service"
    },
    "spec": {
      "name": "simple-service",
      "componentType": "service",
      "typeId": "SERVICE",
      "description": "Simple-service is a no-nonsense service",
      "dependsOn": [],
      "tribe": "platform",
      "squad": "cloud-runtime",
      "links": [
        {
          "name": "Repository",
          "type": "REPOSITORY",
          "url": "https://github.com/motain/simple-service"
        }
      ],
      "labels": ["platform", "cloud-runtime"]
    }
  },
  "metrics": [
    {
      "metricName": "allocation-efficiency",
      "metricId": "metric-67890"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "status_code": 201,
  "id": "comp-12345",
  "message": "Component created successfully",
  "metricSources": [
    {
      "metricName": "allocation-efficiency",
      "metricId": "metric-67890",
      "metricSourceId": "ms-11111"
    }
  ],
  "createdAt": "2025-06-02T10:00:00Z"
}
```

**Error Responses:**
```json
// 400 Bad Request - Validation Error
{
  "status_code": 400,
  "error": "VALIDATION_ERROR",
  "message": "Component validation failed",
  "details": [
    {
      "field": "spec.typeId",
      "error": "Invalid typeId. Must be one of: SERVICE, LIBRARY, WEBSITE, APPLICATION, TEMPLATE, RUNTIME"
    },
    {
      "field": "spec.name",
      "error": "Component name is required"
    }
  ],
  "timestamp": "2025-06-02T10:00:00Z"
}

// 409 Conflict - Already Exists
{
  "status_code": 409,
  "error": "ALREADY_EXISTS",
  "message": "Component with name 'simple-service' already exists",
  "existingId": "comp-54321",
  "timestamp": "2025-06-02T10:00:00Z"
}

// 422 Unprocessable Entity - Invalid Metrics
{
  "status_code": 422,
  "error": "INVALID_METRICS",
  "message": "One or more metrics are invalid",
  "details": [
    {
      "metricName": "invalid-metric",
      "metricId": "metric-99999",
      "error": "Metric not found"
    }
  ],
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **4. Update Component**

**Endpoint:** `PUT /api/v1/components/{id}`

**Description:** Update an existing component's specification

**Path Parameters:**
- `id` (string, required): The Compass component ID

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "metadata": {
    "name": "simple-service"
  },
  "spec": {
    "name": "simple-service",
    "componentType": "service",
    "typeId": "SERVICE",
    "description": "Updated description for simple-service",
    "dependsOn": ["dependency-service"],
    "tribe": "platform",
    "squad": "cloud-runtime",
    "links": [
      {
        "name": "Repository",
        "type": "REPOSITORY",
        "url": "https://github.com/motain/simple-service"
      },
      {
        "name": "New Dashboard",
        "type": "DASHBOARD",
        "url": "https://dashboard.example.com"
      }
    ],
    "labels": ["platform", "cloud-runtime", "updated"]
  }
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "id": "comp-12345",
  "message": "Component updated successfully",
  "updatedAt": "2025-06-02T11:00:00Z",
  "changes": [
    {
      "field": "spec.description",
      "oldValue": "Simple-service is a no-nonsense service",
      "newValue": "Updated description for simple-service"
    },
    {
      "field": "spec.dependsOn",
      "oldValue": [],
      "newValue": ["dependency-service"]
    }
  ]
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Component with ID 'comp-12345' not found",
  "timestamp": "2025-06-02T11:00:00Z"
}

// 400 Bad Request - Validation Error
{
  "status_code": 400,
  "error": "VALIDATION_ERROR",
  "message": "Component update validation failed",
  "details": [
    {
      "field": "spec.dependsOn",
      "error": "Dependency 'dependency-service' not found"
    }
  ],
  "timestamp": "2025-06-02T11:00:00Z"
}

// 409 Conflict - Concurrent Modification
{
  "status_code": 409,
  "error": "CONFLICT",
  "message": "Component was modified by another process",
  "timestamp": "2025-06-02T11:00:00Z"
}
```

---

### **5. Delete Component**

**Endpoint:** `DELETE /api/v1/components/{id}`

**Description:** Delete a component by its Compass ID

**Path Parameters:**
- `id` (string, required): The Compass component ID

**Request Example:**
```bash
DELETE /api/v1/components/comp-12345
Accept: application/json
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Component deleted successfully",
  "deletedId": "comp-12345",
  "deletedAt": "2025-06-02T12:00:00Z"
}
```

**Success Response (204):**
```
HTTP/1.1 204 No Content
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND", 
  "message": "Component with ID 'comp-12345' not found",
  "timestamp": "2025-06-02T12:00:00Z"
}

// 409 Conflict - Has Dependencies
{
  "status_code": 409,
  "error": "HAS_DEPENDENCIES",
  "message": "Cannot delete component with active dependencies",
  "dependencies": [
    {
      "type": "component",
      "id": "comp-99999",
      "name": "dependent-service"
    }
  ],
  "timestamp": "2025-06-02T12:00:00Z"
}
```

---

## 📊 **Metric Endpoints**

### **1. Get Metric by ID**

**Endpoint:** `GET /api/v1/metrics/{id}`

**Description:** Retrieve a metric by its Compass ID

**Path Parameters:**
- `id` (string, required): The Compass metric ID

**Request Example:**
```bash
GET /api/v1/metrics/metric-67890
Accept: application/json
```

**Success Response (200):**
```json
{
  "id": "metric-67890",
  "name": "allocation-efficiency",
  "spec": {
    "name": "allocation-efficiency",
    "description": "https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md#cost-optimization-grading-system",
    "format": {
      "unit": "Allocation Efficiency"
    },
    "facts": [
      {
        "id": "check-app-toml-resource-request",
        "name": "Check if CPU requests and memory requests are defined",
        "type": "extract",
        "source": "github",
        "rule": "jsonpath",
        "repo": "${Metadata.Name}",
        "filePath": "app.toml",
        "jsonPath": "(.service.cpu_requests // .service.production.cpu_requests | . != null) and (.service.memory_requests // .service.production.memory_requests | . != null)"
      }
    ],
    "componentType": ["service", "cloud-resource"],
    "grading-system": "cost-optimization",
    "cronSchedule": "0 * * * *"
  },
  "createdAt": "2025-06-02T10:00:00Z",
  "updatedAt": "2025-06-02T10:00:00Z"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Metric with ID 'metric-67890' not found",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **2. Get Metric by Name (Import)**

**Endpoint:** `GET /api/v1/metrics/by-name/{name}`

**Description:** Retrieve a metric by its name for import functionality

**Path Parameters:**
- `name` (string, required): The metric name

**Request Example:**
```bash
GET /api/v1/metrics/by-name/allocation-efficiency
Accept: application/json
```

**Success Response (200):**
```json
{
  "id": "metric-67890",
  "name": "allocation-efficiency",
  "spec": {
    "name": "allocation-efficiency",
    "description": "https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md#cost-optimization-grading-system",
    "format": {
      "unit": "Allocation Efficiency"
    },
    "facts": [
      {
        "id": "check-app-toml-resource-request",
        "name": "Check if CPU requests and memory requests are defined",
        "type": "extract",
        "source": "github",
        "rule": "jsonpath"
      }
    ],
    "componentType": ["service", "cloud-resource"],
    "grading-system": "cost-optimization"
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Metric with name 'allocation-efficiency' not found",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **3. Create Metric**

**Endpoint:** `POST /api/v1/metrics`

**Description:** Create a new metric

**Request Headers:**
```
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "metadata": {
    "name": "allocation-efficiency"
  },
  "spec": {
    "name": "allocation-efficiency",
    "description": "https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md#cost-optimization-grading-system",
    "format": {
      "unit": "Allocation Efficiency"
    },
    "facts": [
      {
        "id": "check-app-toml-resource-request",
        "name": "Check if CPU requests and memory requests are defined in app.toml",
        "type": "extract",
        "source": "github",
        "rule": "jsonpath",
        "repo": "${Metadata.Name}",
        "filePath": "app.toml",
        "jsonPath": "(.service.cpu_requests // .service.production.cpu_requests | . != null) and (.service.memory_requests // .service.production.memory_requests | . != null)"
      },
      {
        "id": "aggregate-resource-requests",
        "name": "check resource requests and limits",
        "type": "aggregate",
        "method": "and",
        "dependsOn": ["check-app-toml-resource-request"]
      }
    ],
    "componentType": ["service", "cloud-resource"],
    "grading-system": "cost-optimization",
    "cronSchedule": "0 * * * *"
  }
}
```

**Success Response (201):**
```json
{
  "status_code": 201,
  "id": "metric-67890",
  "message": "Metric created successfully",
  "createdAt": "2025-06-02T10:00:00Z"
}
```

**Error Responses:**
```json
// 400 Bad Request - Validation Error
{
  "status_code": 400,
  "error": "VALIDATION_ERROR",
  "message": "Metric validation failed",
  "details": [
    {
      "field": "spec.grading-system",
      "error": "Invalid grading system. Must be one of: resiliency, observability, production-readiness, security, cost-optimization"
    },
    {
      "field": "spec.facts[0].jsonPath",
      "error": "Invalid JSONPath expression"
    }
  ],
  "timestamp": "2025-06-02T10:00:00Z"
}

// 409 Conflict - Already Exists
{
  "status_code": 409,
  "error": "ALREADY_EXISTS",
  "message": "Metric with name 'allocation-efficiency' already exists",
  "existingId": "metric-54321",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **4. Update Metric**

**Endpoint:** `PUT /api/v1/metrics/{id}`

**Description:** Update an existing metric's specification

**Path Parameters:**
- `id` (string, required): The Compass metric ID

**Request Body:**
```json
{
  "metadata": {
    "name": "allocation-efficiency"
  },
  "spec": {
    "name": "allocation-efficiency",
    "description": "Updated description for allocation efficiency metric",
    "format": {
      "unit": "Allocation Efficiency Percentage"
    },
    "facts": [
      {
        "id": "check-app-toml-resource-request",
        "name": "Updated check for CPU and memory requests",
        "type": "extract",
        "source": "github",
        "rule": "jsonpath",
        "repo": "${Metadata.Name}",
        "filePath": "app.toml",
        "jsonPath": "(.service.cpu_requests // .service.production.cpu_requests | . != null) and (.service.memory_requests // .service.production.memory_requests | . != null)"
      }
    ],
    "componentType": ["service", "cloud-resource"],
    "grading-system": "cost-optimization",
    "cronSchedule": "0 2 * * *"
  }
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "id": "metric-67890",
  "message": "Metric updated successfully",
  "updatedAt": "2025-06-02T11:00:00Z",
  "changes": [
    {
      "field": "spec.description",
      "oldValue": "https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md#cost-optimization-grading-system",
      "newValue": "Updated description for allocation efficiency metric"
    },
    {
      "field": "spec.cronSchedule",
      "oldValue": "0 * * * *",
      "newValue": "0 2 * * *"
    }
  ]
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Metric with ID 'metric-67890' not found",
  "timestamp": "2025-06-02T11:00:00Z"
}

// 400 Bad Request
{
  "status_code": 400,
  "error": "VALIDATION_ERROR", 
  "message": "Metric update validation failed",
  "details": [
    {
      "field": "spec.cronSchedule",
      "error": "Invalid cron schedule format"
    }
  ],
  "timestamp": "2025-06-02T11:00:00Z"
}
```

---

### **5. Delete Metric**

**Endpoint:** `DELETE /api/v1/metrics/{id}`

**Description:** Delete a metric by its Compass ID

**Path Parameters:**
- `id` (string, required): The Compass metric ID

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Metric deleted successfully",
  "deletedId": "metric-67890",
  "deletedAt": "2025-06-02T12:00:00Z"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Metric with ID 'metric-67890' not found",
  "timestamp": "2025-06-02T12:00:00Z"
}

// 409 Conflict - Used by Components/Scorecards
{
  "status_code": 409,
  "error": "IN_USE",
  "message": "Cannot delete metric that is referenced by other resources",
  "usedBy": [
    {
      "type": "scorecard",
      "id": "scorecard-123",
      "name": "cost-optimization"
    },
    {
      "type": "component",
      "id": "comp-456",
      "name": "simple-service"
    }
  ],
  "timestamp": "2025-06-02T12:00:00Z"
}
```

---

## 📋 **Scorecard Endpoints**

### **1. Get Scorecard by ID**

**Endpoint:** `GET /api/v1/scorecards/{id}`

**Description:** Retrieve a scorecard by its Compass ID

**Path Parameters:**
- `id` (string, required): The Compass scorecard ID

**Success Response (200):**
```json
{
  "id": "scorecard-123",
  "name": "cost-optimization",
  "spec": {
    "name": "cost-optimization",
    "componentTypeIds": ["SERVICE"],
    "criteria": [
      {
        "hasMetricValue": {
          "comparator": "EQUALS",
          "comparatorValue": 1,
          "metricName": "allocation-efficiency",
          "name": "allocation-efficiency",
          "weight": 100
        }
      }
    ],
    "description": "https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md#cost-optimization-grading-system",
    "importance": "REQUIRED",
    "ownerId": "712020:edcf2690-1f3e-4310-9eb8-1ecef88d64b6",
    "scoringStrategyType": "WEIGHT_BASED",
    "state": "PUBLISHED"
  },
  "createdAt": "2025-06-02T10:00:00Z",
  "updatedAt": "2025-06-02T10:00:00Z"
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Scorecard with ID 'scorecard-123' not found",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **2. Get Scorecard by Name (Import)**

**Endpoint:** `GET /api/v1/scorecards/by-name/{name}`

**Description:** Retrieve a scorecard by its name for import functionality

**Path Parameters:**
- `name` (string, required): The scorecard name

**Success Response (200):**
```json
{
  "id": "scorecard-123",
  "name": "cost-optimization",
  "spec": {
    "name": "cost-optimization",
    "componentTypeIds": ["SERVICE"],
    "criteria": [
      {
        "hasMetricValue": {
          "comparator": "EQUALS",
          "comparatorValue": 1,
          "metricName": "allocation-efficiency",
          "name": "allocation-efficiency",
          "weight": 100
        }
      }
    ],
    "description": "https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md",
    "importance": "REQUIRED",
    "scoringStrategyType": "WEIGHT_BASED",
    "state": "PUBLISHED"
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Scorecard with name 'cost-optimization' not found",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **3. Create Scorecard**

**Endpoint:** `POST /api/v1/scorecards`

**Description:** Create a new scorecard

**Request Body:**
```json
{
  "metadata": {
    "name": "cost-optimization"
  },
  "spec": {
    "name": "cost-optimization",
    "componentTypeIds": ["SERVICE"],
    "criteria": [
      {
        "hasMetricValue": {
          "comparator": "EQUALS",
          "comparatorValue": 1,
          "metricName": "allocation-efficiency",
          "name": "allocation-efficiency",
          "weight": 100
        }
      }
    ],
    "description": "https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md#cost-optimization-grading-system",
    "importance": "REQUIRED",
    "ownerId": "712020:edcf2690-1f3e-4310-9eb8-1ecef88d64b6",
    "scoringStrategyType": "WEIGHT_BASED",
    "state": "PUBLISHED"
  }
}
```

**Success Response (201):**
```json
{
  "status_code": 201,
  "id": "scorecard-123",
  "message": "Scorecard created successfully",
  "createdAt": "2025-06-02T10:00:00Z"
}
```

**Error Responses:**
```json
// 400 Bad Request - Validation Error
{
  "status_code": 400,
  "error": "VALIDATION_ERROR",
  "message": "Scorecard validation failed",
  "details": [
    {
      "field": "spec.componentTypeIds",
      "error": "At least one component type ID is required"
    },
    {
      "field": "spec.criteria[0].hasMetricValue.metricName",
      "error": "Referenced metric 'invalid-metric' does not exist"
    },
    {
      "field": "spec.scoringStrategyType",
      "error": "Invalid scoring strategy. Must be one of: WEIGHT_BASED, POINT_BASED"
    }
  ],
  "timestamp": "2025-06-02T10:00:00Z"
}

// 409 Conflict - Already Exists
{
  "status_code": 409,
  "error": "ALREADY_EXISTS",
  "message": "Scorecard with name 'cost-optimization' already exists",
  "existingId": "scorecard-456",
  "timestamp": "2025-06-02T10:00:00Z"
}
```

---

### **4. Update Scorecard**

**Endpoint:** `PUT /api/v1/scorecards/{id}`

**Description:** Update an existing scorecard's specification

**Path Parameters:**
- `id` (string, required): The Compass scorecard ID

**Request Body:**
```json
{
  "metadata": {
    "name": "cost-optimization"
  },
  "spec": {
    "name": "cost-optimization",
    "componentTypeIds": ["SERVICE", "LIBRARY"],
    "criteria": [
      {
        "hasMetricValue": {
          "comparator": "GREATER_THAN",
          "comparatorValue": 0.8,
          "metricName": "allocation-efficiency",
          "name": "allocation-efficiency",
          "weight": 80
        }
      },
      {
        "hasMetricValue": {
          "comparator": "EQUALS",
          "comparatorValue": 1,
          "metricName": "resource-optimization",
          "name": "resource-optimization",
          "weight": 20
        }
      }
    ],
    "description": "Updated cost optimization scorecard with multiple criteria",
    "importance": "RECOMMENDED",
    "ownerId": "712020:edcf2690-1f3e-4310-9eb8-1ecef88d64b6",
    "scoringStrategyType": "WEIGHT_BASED",
    "state": "PUBLISHED"
  }
}
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "id": "scorecard-123",
  "message": "Scorecard updated successfully",
  "updatedAt": "2025-06-02T11:00:00Z",
  "changes": [
    {
      "field": "spec.componentTypeIds",
      "oldValue": ["SERVICE"],
      "newValue": ["SERVICE", "LIBRARY"]
    },
    {
      "field": "spec.criteria",
      "oldValue": "1 criterion",
      "newValue": "2 criteria"
    },
    {
      "field": "spec.importance",
      "oldValue": "REQUIRED",
      "newValue": "RECOMMENDED"
    }
  ]
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Scorecard with ID 'scorecard-123' not found",
  "timestamp": "2025-06-02T11:00:00Z"
}

// 400 Bad Request
{
  "status_code": 400,
  "error": "VALIDATION_ERROR",
  "message": "Scorecard update validation failed",
  "details": [
    {
      "field": "spec.criteria[1].hasMetricValue.metricName",
      "error": "Referenced metric 'resource-optimization' does not exist"
    }
  ],
  "timestamp": "2025-06-02T11:00:00Z"
}
```

---

### **5. Delete Scorecard**

**Endpoint:** `DELETE /api/v1/scorecards/{id}`

**Description:** Delete a scorecard by its Compass ID

**Path Parameters:**
- `id` (string, required): The Compass scorecard ID

**Request Example:**
```bash
DELETE /api/v1/scorecards/scorecard-123
Accept: application/json
```

**Success Response (200):**
```json
{
  "status_code": 200,
  "message": "Scorecard deleted successfully",
  "deletedId": "scorecard-123",
  "deletedAt": "2025-06-02T12:00:00Z"
}
```

**Success Response (204):**
```
HTTP/1.1 204 No Content
```

**Error Responses:**
```json
// 404 Not Found
{
  "status_code": 404,
  "error": "NOT_FOUND",
  "message": "Scorecard with ID 'scorecard-123' not found",
  "timestamp": "2025-06-02T12:00:00Z"
}

// 409 Conflict - Used by Components
{
  "status_code": 409,
  "error": "IN_USE",
  "message": "Cannot delete scorecard that is being used by components",
  "usedBy": [
    {
      "type": "component",
      "id": "comp-456",
      "name": "simple-service",
      "typeId": "SERVICE"
    }
  ],
  "timestamp": "2025-06-02T12:00:00Z"
}
```

---

## 🔒 **Authentication & Authorization**

### **Authentication**
All endpoints should support the following authentication methods:

1. **Service-to-Service Authentication**
   ```bash
   Authorization: Bearer <service-token>
   ```

2. **Internal Cluster Communication**
   ```bash
   X-Service-Account: catalog-controller
   X-Namespace: catalog-system
   ```

### **Authorization**
- **Read Operations** (GET): Requires `catalog:read` permission
- **Create Operations** (POST): Requires `catalog:write` permission
- **Update Operations** (PUT): Requires `catalog:write` permission
- **Delete Operations** (DELETE): Requires `catalog:delete` permission

---

## 📊 **Rate Limiting**

### **Rate Limits**
```
- Per Service: 1000 requests/minute
- Per Endpoint: 100 requests/minute  
- Burst Limit: 50 requests/10 seconds
```

### **Rate Limit Headers**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1672531200
X-RateLimit-Retry-After: 60
```

### **Rate Limit Error Response (429)**
```json
{
  "status_code": 429,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Try again in 60 seconds",
  "retryAfter": 60,
  "timestamp": "2025-06-02T12:00:00Z"
}
```

---

## 🔄 **Common Error Responses**

### **Standard Error Format**
All error responses follow this structure:

```json
{
  "status_code": 400,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": [...],  // Optional: detailed validation errors
  "timestamp": "2025-06-02T12:00:00Z",
  "requestId": "req-12345-67890"  // Optional: for tracing
}
```

### **Common Error Codes**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| `400` | `VALIDATION_ERROR` | Request validation failed |
| `400` | `INVALID_JSON` | Invalid JSON in request body |
| `400` | `MISSING_FIELD` | Required field is missing |
| `400` | `INVALID_FORMAT` | Field format is invalid |
| `401` | `UNAUTHORIZED` | Authentication required |
| `403` | `FORBIDDEN` | Insufficient permissions |
| `404` | `NOT_FOUND` | Resource not found |
| `409` | `ALREADY_EXISTS` | Resource already exists |
| `409` | `CONFLICT` | Resource conflict |
| `409` | `IN_USE` | Resource is being used |
| `422` | `UNPROCESSABLE_ENTITY` | Valid request but cannot be processed |
| `429` | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `500` | `INTERNAL_ERROR` | Internal server error |
| `502` | `BAD_GATEWAY` | Upstream service error |
| `503` | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `504` | `GATEWAY_TIMEOUT` | Upstream service timeout |

---

## 🏥 **Health & Monitoring**

### **Health Check Endpoint**
```bash
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-06-02T12:00:00Z",
  "version": "1.0.0",
  "uptime": "24h30m15s",
  "dependencies": {
    "database": "healthy",
    "cache": "healthy",
    "external_services": "healthy"
  }
}
```

### **Metrics Endpoint**
```bash
GET /api/v1/metrics
```

**Response (Prometheus format):**
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/api/v1/components",status="200"} 1234

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 100
```

---

## 🔧 **Implementation Requirements**

### **Technical Requirements**

1. **Response Times**
    - GET requests: < 100ms (95th percentile)
    - POST/PUT requests: < 500ms (95th percentile)
    - DELETE requests: < 200ms (95th percentile)

2. **Data Consistency**
    - ACID compliance for database operations
    - Optimistic locking for concurrent updates
    - Transaction rollback on errors

3. **Input Validation**
    - JSON schema validation for all request bodies
    - Path parameter validation
    - Query parameter validation
    - Data sanitization for security

4. **Logging & Tracing**
    - Structured logging (JSON format)
    - Request/Response logging
    - Distributed tracing support (OpenTracing/Jaeger)
    - Error tracking and alerting

### **Data Storage Requirements**

1. **Resource Naming**
    - Names must be unique within resource type
    - Names: 1-63 characters, alphanumeric + hyphens
    - IDs: UUIDs or similar unique identifiers

2. **Audit Trail**
    - Track all create/update/delete operations
    - Store who made changes and when
    - Maintain change history for compliance

3. **Data Validation**
    - Enforce foreign key constraints
    - Validate enum values
    - Check required fields
    - Validate JSON schema compliance

### **Security Requirements**

1. **Input Sanitization**
    - Escape special characters
    - Prevent SQL injection
    - Validate file paths and URLs
    - Limit request payload sizes

2. **Error Handling**
    - Never expose internal system details
    - Log security events
    - Rate limit failed authentication attempts
    - Implement circuit breakers for upstream services

---

## 📋 **Testing Requirements**

### **Unit Tests**
- Test all endpoint handlers
- Test validation logic
- Test error scenarios
- Test edge cases

### **Integration Tests**
- Test database interactions
- Test external service dependencies
- Test authentication/authorization
- Test concurrent operations

### **Load Tests**
- Test rate limiting
- Test performance under load
- Test resource cleanup
- Test failover scenarios

### **Contract Tests**
- Validate request/response schemas
- Test API backward compatibility
- Test error response formats
- Test pagination behavior

---

## 🚀 **Deployment Considerations**

### **Environment Variables**
```bash
DATABASE_URL=postgresql://user:pass@db:5432/compass
REDIS_URL=redis://cache:6379/0
LOG_LEVEL=info
API_VERSION=v1
RATE_LIMIT_ENABLED=true
AUTH_ENABLED=true
```

### **Kubernetes Configuration**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: compass-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: compass-service
        image: compass-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: compass-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi" 
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### **Service Configuration**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: compass-service
  namespace: compass
spec:
  selector:
    app: compass-service
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
```

This completes the comprehensive API specification for the 15 critical Compass-Service endpoints required by your Kubernetes controllers.