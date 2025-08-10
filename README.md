# NestJS Starter Template

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![PM2](https://img.shields.io/badge/PM2-Ready-2B037A?style=for-the-badge&logo=pm2)](https://pm2.keymetrics.io/)

## 📋 Description

A production-ready NestJS starter template with Docker, PM2, and best practices pre-configured. This template provides a solid foundation for building scalable Node.js applications with TypeScript. It also implements abstract crud classes

### ✨ Features

- 🚀 **NestJS v11** - Progressive Node.js framework
- 📝 **TypeScript** - Type safety and modern JavaScript features
- 🐳 **Docker Ready** - Containerized development and deployment
- ⚙️ **PM2 Configuration** - Production process management
- 📚 **Swagger/OpenAPI** - Auto-generated API documentation
- ✅ **Testing Setup** - Unit and E2E tests with Jest
- 🎯 **ESLint & Prettier** - Code quality and formatting
- 🔧 **Environment Configuration** - Secure configuration management

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
openssl rand -base64 756 > ./mongodb/mongo-dev-keyfile
chmod 600 ./mongodb/mongo-dev-keyfile
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
