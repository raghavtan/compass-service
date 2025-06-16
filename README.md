This implementation provides a complete REST API wrapper for Atlassian Compass GraphQL operations with proper error
handling, validation, and documentation.

## Getting Started

run `make dev`

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Run the application: `npm run start:dev`
5. Access Swagger documentation at: `http://localhost:3000/api`

# 🔌 ** Compass-Service Endpoints**

#### **Component Endpoints**
```
GET    /api/v1/components/{id}              # Get by Compass ID
GET    /api/v1/components/by-name/{name}    # Import existing by name
POST   /api/v1/components                   # Create new component
PUT    /api/v1/components/{id}              # Update component spec
DELETE /api/v1/components/{id}              # Delete component
```

#### **Metric Endpoints**
```
GET    /api/v1/metrics/{id}                 # Get by Compass ID
GET    /api/v1/metrics/by-name/{name}       # Import existing by name
POST   /api/v1/metrics                      # Create new metric
PUT    /api/v1/metrics/{id}                 # Update metric spec
DELETE /api/v1/metrics/{id}                 # Delete metric
```

#### **Scorecard Endpoints**
```
GET    /api/v1/scorecards/{id}              # Get by Compass ID
GET    /api/v1/scorecards/by-name/{name}    # Import existing by name
POST   /api/v1/scorecards                   # Create new scorecard
PUT    /api/v1/scorecards/{id}              # Update scorecard spec
DELETE /api/v1/scorecards/{id}              # Delete scorecard
```
