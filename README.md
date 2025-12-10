# NestJS Starter Template

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![PM2](https://img.shields.io/badge/PM2-Ready-2B037A?style=for-the-badge&logo=pm2)](https://pm2.keymetrics.io/)

## 📋 Description

A production-ready NestJS starter template with Docker, PM2, and best practices pre-configured. This template provides a solid foundation for building scalable Node.js applications with TypeScript. It includes powerful abstract CRUD services and entities that accelerate development by providing consistent patterns for data operations.

### ✨ Features

- 🚀 **NestJS v11** - Progressive Node.js framework
- 📝 **TypeScript** - Type safety and modern JavaScript features
- 🐳 **Docker Ready** - Containerized development and deployment
- ⚙️ **PM2 Configuration** - Production process management
- 📚 **Swagger/OpenAPI** - Auto-generated API documentation
- ✅ **Testing Setup** - Unit and E2E tests with Jest
- 🎯 **ESLint & Prettier** - Code quality and formatting
- 🔧 **Environment Configuration** - Secure configuration management
- 🏗️ **Abstract CRUD System** - Reusable base classes for entities, services, and controllers
- 🔍 **Advanced Querying** - Built-in pagination, search, sorting, and filtering
- 🏷️ **Slug Support** - Automatic slug generation for SEO-friendly URLs
- 💾 **MongoDB Integration** - Mongoose with transaction support and retry logic

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (optional)
- Git

### Quick Project Name Change

To quickly rename this project from `nest-starter` to your own project name, use these sed commands:

### macOS/BSD:
```bash
# Replace in all relevant files
find . -type f \( -name "*.json" -o -name "*.yml" -o -name "*.js" -o -name "Caddyfile" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' 's/nest-starter/your-project-name/g' {} +
```

### Linux:
```bash
# Replace in all relevant files
find . -type f \( -name "*.json" -o -name "*.yml" -o -name "*.js" -o -name "Caddyfile" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i 's/nest-starter/your-project-name/g' {} +
```

### Files that will be updated:
- `package.json` - Project name
- `package-lock.json` - Package lock references
- `docker-compose.yml` - Container and image names
- `ecosystem.config.js` - PM2 app name
- `Caddyfile` - Domain configuration

**Note:** After renaming, run `npm install` to update package-lock.json properly.


## 📦 Installation
### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/nest-starter.git
cd nest-starter

# Install dependencies
npm install
```


### Generate Mongodb auth keyfile properly
```sh
mkdir mongodb
openssl rand -base64 756 > ./mongodb/mongo-local-dev-keyfile
chmod 600 ./mongodb/mongo-local-dev-keyfile
```

### Generate redis conf file
```sh 
echo "requirepass devredispass\nappendonly yes" > ./redis.dev.conf
```

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

### Init MongoDB replica
```sh
sh ./scripts/init-replica.sh --env dev
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=mongodb://localhost:27017/nest-starter

# API Documentation
SWAGGER_USER=admin
SWAGGER_PASSWORD=changeme
```

## 💻 Development

```bash
# Development with hot reload
npm run start:dev

# Development with debug
npm run start:debug

# Production build
npm run build
npm run start:prod

# Format code
npm run format

# Lint code
npm run lint
```

### API Documentation

Swagger documentation is available at:
- Local: http://localhost:3000/api
- Production: https://your-domain.com/api

## 🧪 Testing

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## 🚢 Deployment

### Using PM2

```bash
# Start application with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Reload with zero downtime
pm2 reload all
```

### Using Docker

```bash
# Build production image
docker build -t nest-starter:latest .

# Run container
docker run -d \
  --name nest-app \
  -p 3000:3000 \
  --env-file .env \
  nest-starter:latest
```

### Docker Compose Production

```bash
# Deploy with Docker Compose
docker-compose -f docker-compose.yml up -d

# Scale horizontally
docker-compose up -d --scale app=3
```

## 📁 Project Structure

```
nest-starter/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── app.controller.ts    # Root controller
│   └── app.service.ts       # Root service
├── test/
│   ├── app.e2e-spec.ts      # E2E tests
│   └── jest-e2e.json         # Jest E2E configuration
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile               # Docker image definition
├── ecosystem.config.js      # PM2 configuration
├── Caddyfile               # Caddy server configuration
└── package.json            # Project metadata and scripts
```

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start application |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start with debugger |
| `npm run start:prod` | Start production build |
| `npm run build` | Build application |
| `npm run format` | Format code with Prettier |
| `npm run lint` | Lint code with ESLint |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Generate test coverage |
| `npm run test:e2e` | Run E2E tests |

## 🏗️ Abstract CRUD System

This template includes a powerful abstract CRUD system that provides reusable base classes for entities, services, and controllers. This system accelerates development by providing consistent patterns for data operations with built-in features like pagination, search, sorting, and transaction support.

### 📋 Core Components

#### Base Entity (`CrudEntity`)

The base abstract entity provides common fields for all entities:

```typescript
import { Schema } from '@nestjs/mongoose';
import { CrudEntity } from './src/crud/entities/crud.entity';

@Schema()
export class Product extends CrudEntity {
  // already auto inherited name, description and metadata
  // Your custom fields here
  @Prop()
  sku: string;
 
}
```

**Fields included:**
- `user`: Reference to the user who created the entity (optional)
- `name`: Entity name (optional)
- `description`: Entity description (optional) 
- `metadata`: Flexible key-value storage (optional)

#### Base Service (`AbstractCrudService`)

The abstract service provides complete CRUD operations with MongoDB transaction support ensuring that an operation wholly succees or fails:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractCrudService } from './src/crud/services/crud.service';
import { MyEntity } from './entities/my.entity';
import { CreateMyDto } from './dto/create-my.dto';
import { UpdateMyDto } from './dto/update-my.dto';

@Injectable()
export class Sale extends AbstractCrudService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(@InjectModel(MyEntity.name) model: Model<MyEntity>) {
    super(connection, model);
  }

  // Override populator if needed
  get populator(): string[] {
    return ['user', 'customRelation'];
  }
}
```

#### Base Controller (`AbstractCrudController`)

The abstract controller provides standard REST endpoints:

```typescript
import { Controller } from '@nestjs/common';
import { AbstractCrudController } from './src/crud/controllers/crud.controller';
import { MyEntity } from './entities/my.entity';
import { MyService } from './services/my.service';
import { CreateMyDto } from './dto/create-my.dto';
import { UpdateMyDto } from './dto/update-my.dto';

@Controller('sales')
export class Sale extends AbstractCrudController<
  MyEntity,
  CreateMyDto,
  UpdateMyDto
> {
  constructor(private readonly myService: MyService) {
    super(myService);
  }
}
```
This automatically makes the following endpoints availabe
POST `/sales`
GET `/sales`
GET `/sales/:id`
PATCH `/sales/:id`
DELETE `/sales/:id`

### 🔧 Service Methods Explained

#### Standard CRUD Operations

| Method | Description | Usage |
|--------|-------------|--------|
| `create(dto, user?, session?)` | Creates a new entity | Basic entity creation |
| `findAll(query, session?)` | Retrieves entities with pagination | List entities with filters |
| `findOne(id, session?)` | Retrieves a single entity | Get entity by ID |
| `remove(id, session?)` | Deletes an entity | Delete entity |

#### Update Operations

##### `update(id, updateDto, session?)`
- **Purpose**: Standard partial update of entity fields
- **When to use**: When you want to update only specific fields that are included in your UpdateDto
- **Behavior**: Only updates fields present in the DTO, ignores undefined/null values
- **Example**:
```typescript
// Only updates description and metadata fields
await service.update(id, { 
  description: 'New description',
  metadata: { updated: true }
});
```

##### `forceUpdate(id, update, session?)`  
- **Purpose**: Direct database update with any fields
- **When to use**: When you need to update fields not included in your UpdateDto or perform complex updates
- **Behavior**: Directly passes the update object to MongoDB's `findByIdAndUpdate`
- **Example**:
```typescript
// Can update any field, even those not in UpdateDto
await service.forceUpdate(id, { 
  customField: 'new value',
  'metadata.nested.field': 'deep update',
  lastModified: new Date()
});
```

##### `increment(id, fields, session?)`
- **Purpose**: Atomically increment/decrement numeric fields
- **When to use**: For counters, scores, quantities, or any numeric operations that need to be atomic
- **Behavior**: Uses MongoDB's `$inc` operator for atomic operations
- **Example**:
```typescript
// Increment view count and decrease stock
await service.increment(id, { 
  viewCount: 1,
  stockQuantity: -1,
  'metrics.totalClicks': 5
});
```

### 🏷️ Slug-Aware Entities

For entities that need SEO-friendly URLs, extend the `SlugCrudEntity`:

#### Slug Entity
```typescript
import { Schema } from '@nestjs/mongoose';
import { SlugCrudEntity } from './src/crud/entities/slug-crud.entity';

@Schema()
export class Product extends SlugCrudEntity {
 // auto ge'ts a crud generated based on the product name
}
```

#### Slug Service  
```typescript
import { Injectable } from '@nestjs/common';
import { SlugAwareCrudService } from './src/crud/services/slug-crud.service';

@Injectable()
export class MySlugService extends SlugAwareCrudService<
  MySlugEntity,
  CreateMySlugDto,
  UpdateMySlugDto
> {
  constructor(@InjectModel(MySlugEntity.name) model: Model<MySlugEntity>) {
    super(connection, model);
  }

  // Override slug source field (defaults to 'name')
  slugSource = 'sku';
}
```

**Slug features:**
- Automatic slug generation from a source field (default: `name`)
- Unique slug enforcement with automatic suffixes
- Find by ID or slug: `findOne('my-slug')` or `findOne('507f1f77bcf86cd799439011')`

### 🔍 Advanced Querying

The `findAll` method supports comprehensive querying options:

#### Query Parameters

```typescript
const query = {
  // Text search across indexed fields
  search: 'search term',
  
  // Pagination
  page: 1,
  limit: 10,
  
  // Sorting (field:order format)
  sort: 'createdAt:desc,name:asc',
  
  // Field filtering (supports MongoDB ObjectIds)
  user: '507f1f77bcf86cd799439011',
  status: 'active',
  
  // Metadata filtering
  metadata: { category: 'tech' }
};

const result = await service.findAll(query);
```

#### Response Format

```typescript
{
  data: MyEntity[],
  pagination: {
    total: 100,
    page: 1, 
    limit: 10,
    totalPages: 10
  }
}
```

### 💾 Transaction Support

All service methods support MongoDB transactions via the optional `session` parameter:

```typescript
const session = await this.connection.startSession();
session.startTransaction();

try {
  const entity1 = await service1.create(dto1, user, session);
  const entity2 = await service2.update(id, dto2, session);
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  await session.endSession();
}
```

The abstract service includes automatic retry logic and session management through the `withSession` method.

### 📝 DTOs and Validation

#### Base DTOs

**CreateCrudDto:**
```typescript
{
  name: string;              // Required
  description?: string;      // Optional
  user?: Types.ObjectId;     // Optional (auto-set from auth)
  metadata?: Record<string, any>; // Optional
}
```

**UpdateCrudDto:**
```typescript
{
  description?: string;      // Optional
  metadata?: Record<string, any>; // Optional
}
```

**QueryDto:**
```typescript
{
  search?: string;           // Text search
  page?: number;             // Page number (min: 1)
  limit?: number;            // Items per page (1-100)  
  sort?: string;             // Sort format: "field:order"
  [key: string]: any;        // Additional filters
  metadata?: Record<string, any>; // Metadata filters
}
```

### 🎯 Best Practices

1. **Always extend base classes** - Don't recreate CRUD functionality
2. **Use transactions for related operations** - Pass session between service calls
3. **Override populators** - Specify relationships to populate in service
4. **Leverage slug entities** - For public-facing resources needing SEO URLs
5. **Use appropriate update methods**:
   - `update()` for standard user input validation
   - `forceUpdate()` for system-level updates
   - `increment()` for atomic numeric operations
6. **Implement proper validation** - Extend base DTOs with your validation rules
7. **Configure text search** - Add text indexes to your schemas for search functionality

## 🔐 Logto Authentication Module

This template includes a comprehensive Logto Management API integration for authentication and authorization.

### Configuration

Add the following environment variables:

```env
LOGTO_ENDPOINT=https://your-tenant.logto.app
LOGTO_TENANT_ID=your-tenant-id
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_API_RESOURCE_ID=your-api-resource-id
LOGTO_ORGANIZATION_ID=your-organization-id
```

### Services

The Logto module provides grouped services by functionality:

| Service | Description |
|---------|-------------|
| `LogtoUsersService` | User management (CRUD, suspension, roles, scopes) |
| `RolesService` | Role management with scope assignment |
| `PermissionsService` | Permission/scope management |
| `OrganizationsService` | Organization management, user membership, invitations |

### Usage

```typescript
import { LogtoModule, LogtoAuthGuard, Public, Scopes, GetCurrentUser } from './logto';

// Import the module
@Module({
  imports: [LogtoModule],
})
export class AppModule {}

// Apply guard globally or per-controller
@UseGuards(LogtoAuthGuard)
@Controller('protected')
export class ProtectedController {

  @Public() // Mark route as public
  @Get('public')
  publicRoute() {}

  @Scopes('read:users') // Require specific permissions
  @Get('admin')
  adminRoute(@GetCurrentUser() user: CurrentUser) {
    return user;
  }
}
```

### Decorators

| Decorator | Description |
|-----------|-------------|
| `@Public()` | Marks a route as publicly accessible |
| `@Scopes(...scopes)` | Requires specific permission scopes |
| `@GetCurrentUser()` | Injects the authenticated user into route handler |

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is [MIT licensed](LICENSE).

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Inspired by best practices from the NestJS community
