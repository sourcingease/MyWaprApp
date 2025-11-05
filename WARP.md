# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Context

This repository contains a SaaS Agent project that is currently in planning/template phase. The agent is designed to connect to SaaS applications to automate workflows, react to events, and integrate with APIs. The project is intentionally language-agnostic at this stage.

**Azure Integration**: This agent can connect to Azure SQL Database and other Azure services for your existing application infrastructure.

## Architecture Overview

The planned architecture consists of four main components:

- **Agent Core**: Orchestrates tasks and manages lifecycle
- **Connectors**: Interfaces to SaaS APIs and events 
- **Queue/Job Runner**: Executes units of work
- **Storage/Cache**: Maintains state (optional)

The typical flow is: Agent starts → loads config → subscribes to events/polls APIs → dispatches tasks → reports results.

## Key Decisions Needed

Before implementation can begin, these decisions must be made:
- Implementation language/runtime (Node.js, Python, or Go are suggested)
- Authentication and authorization model
- Deployment targets and packaging strategy

## Development Commands

Since no specific runtime has been chosen yet, commands will depend on the implementation language selected:

### For Node.js implementation:
```javascript path=null start=null
npm install          # Install dependencies
npm install mssql @azure/identity @azure/keyvault-secrets  # Azure SQL deps
npm run dev          # Start development server
npm test             # Run tests
npm run build        # Build for production
npm run lint         # Run linting
```

### For Python implementation:
```python path=null start=null
python -m venv .venv          # Create virtual environment
.venv\Scripts\activate        # Activate on Windows
pip install pyodbc azure-identity azure-keyvault-secrets  # Azure SQL deps
pip install -r requirements.txt   # Install dependencies
python -m pytest             # Run tests
python -m src.main            # Run the agent
```

### For Go implementation:
```go path=null start=null
go mod tidy          # Install dependencies
go run cmd/agent/main.go      # Run the agent
go test ./...        # Run tests
go build -o bin/agent cmd/agent/main.go   # Build binary
```

## Repository Structure

- `docs/` - Contains architecture decisions and design notes
  - `architecture.md` - High-level system architecture
  - `overview.md` - Project goals and initial capabilities
- `src/` - Source code placeholder (implementation language TBD)
  - Currently contains only a README with suggested layouts

## Initial Implementation Steps

1. Choose implementation language/runtime
2. Set up development environment and tooling
3. Implement basic configuration loading (env, file, or secret manager)
4. Create API client bootstrap functionality
5. Add health check command as first minimal capability

## Design Principles

The architecture emphasizes:
- **Observability**: Comprehensive logging, metrics, and tracing
- **Resilience**: Retry logic, backoff strategies, and idempotency
- **Security**: Proper secrets management and least privilege access

## Environment Configuration

The project supports multiple configuration sources:
- Environment variables (.env files are gitignored)
- Configuration files
- Secret managers

### Azure-Specific Configuration

For Azure SQL Database integration, you'll need:
- **Connection String**: Store in Azure Key Vault or environment variables
- **Authentication**: Use Azure AD authentication or SQL authentication
- **Managed Identity**: Recommended for Azure-hosted deployments

Example environment variables:
```bash path=null start=null
AZURE_SQL_CONNECTION_STRING=Server=tcp:yourserver.database.windows.net,1433;Database=yourdb;...
AZURE_CLIENT_ID=your-managed-identity-client-id
AZURE_TENANT_ID=your-tenant-id
```

## Azure Integration Capabilities

With Azure SQL Database, the agent can:
- **Data Monitoring**: Query database for changes, metrics, or alerts
- **Automated Responses**: Trigger actions based on database events
- **Data Synchronization**: Keep external systems in sync with your database
- **Reporting & Analytics**: Generate reports from database data
- **Maintenance Tasks**: Automated database maintenance and monitoring

## Future Capabilities

The agent will eventually support:
- Workflow automation
- Event-driven responses
- API integrations
- Task scheduling and execution
- State management and persistence
- Azure Service Bus integration for event-driven architecture
- Azure Functions integration for serverless workflows
