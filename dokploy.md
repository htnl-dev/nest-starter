# Dokploy Deployment Guide

## Overview

This project is configured to deploy on Dokploy with a TUS server for resumable file uploads and the NestJS API.

## Services

1. **API Service** (`nest-api`)
   - NestJS application
   - Port: 3000
   - Handles business logic and TUS webhooks

2. **TUS Server** (`tus-server`)
   - Resumable file upload protocol server
   - Port: 8080
   - Supports large file uploads with resume capability

## Deployment Steps

### 1. Prerequisites

- Dokploy instance running
- Domain names configured for API and uploads
- External Dokploy network created

### 2. Environment Setup

```bash
# Copy the example environment file
cp .env.dokploy.example .env

# Edit with your configuration
nano .env
```

### 3. Deploy with Dokploy

```bash
# Deploy the stack
docker-compose -f docker-compose.dokploy.yml up -d

# Or if using Dokploy CLI
dokploy deploy --compose docker-compose.dokploy.yml
```

### 4. Configure Reverse Proxy in Dokploy

Add these configurations in Dokploy's reverse proxy settings:

#### API Service
```
Domain: api.yourdomain.com
Target: http://nest-api:3000
SSL: Enable Let's Encrypt
```

#### TUS Upload Server
```
Domain: uploads.yourdomain.com
Target: http://tus-server:8080
SSL: Enable Let's Encrypt

# Important headers for TUS
Headers:
  X-Forwarded-Host: $host
  X-Forwarded-Proto: $scheme
  X-Forwarded-For: $proxy_add_x_forwarded_for
```

## TUS Integration in NestJS

### Install TUS client in your frontend:

```bash
npm install tus-js-client
```

### Example upload code:

```typescript
import * as tus from 'tus-js-client';

const upload = new tus.Upload(file, {
  endpoint: 'https://uploads.yourdomain.com/files/',
  retryDelays: [0, 3000, 5000, 10000, 20000],
  metadata: {
    filename: file.name,
    filetype: file.type,
    userId: 'user-123'
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  },
  onProgress: (bytesUploaded, bytesTotal) => {
    const percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);
    console.log(`Uploaded ${percentage}%`);
  },
  onSuccess: () => {
    console.log('Upload completed!');
  }
});

// Start the upload
upload.start();
```

### Handle TUS webhooks in NestJS:

```typescript
// src/webhooks/tus.controller.ts
@Controller('webhooks/tus')
export class TusWebhookController {
  @Post()
  async handleTusHook(@Body() event: any) {
    const { type, id, metadata } = event;
    
    switch(type) {
      case 'post-create':
        // Handle upload creation
        break;
      case 'post-finish':
        // Handle upload completion
        break;
      case 'post-terminate':
        // Handle upload cancellation
        break;
    }
    
    return { received: true };
  }
}
```

## Monitoring

### Check service status:

```bash
# View logs
docker-compose -f docker-compose.dokploy.yml logs -f

# Check API health
curl https://api.yourdomain.com/health

# Check TUS metrics
curl https://uploads.yourdomain.com/metrics
```

### Dokploy Dashboard

Monitor services in Dokploy dashboard:
- CPU and memory usage
- Container logs
- Restart policies
- Health check status

## Scaling

### Horizontal scaling:

```bash
# Scale API instances
docker-compose -f docker-compose.dokploy.yml up -d --scale api=3

# Note: TUS server should remain single instance unless using S3 storage
```

## Backup

### Backup uploaded files:

```bash
# Backup TUS uploads volume
docker run --rm -v nest-starter_tus-uploads:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/tus-backup-$(date +%Y%m%d).tar.gz /data
```

## Troubleshooting

### TUS server issues:

1. **CORS errors**: Check TUS_CORS_ALLOW_ORIGIN environment variable
2. **Upload failures**: Check file size limits and network timeouts
3. **Webhook failures**: Verify API endpoint is accessible from TUS container

### API connection issues:

1. **Network errors**: Ensure containers are on the same Docker network
2. **Database connection**: Verify DATABASE_URL is correct
3. **Health checks failing**: Check application logs for startup errors

## Security Considerations

1. **File uploads**: Implement file type validation and virus scanning
2. **Rate limiting**: Add rate limiting to prevent abuse
3. **Authentication**: Secure TUS uploads with JWT tokens
4. **Storage**: Consider S3 for production file storage
5. **HTTPS**: Always use SSL/TLS in production

## Performance Optimization

1. **CDN**: Use CloudFlare or similar for static assets
2. **Caching**: Implement Redis for session and cache storage
3. **Database**: Use MongoDB Atlas or managed database service
4. **Monitoring**: Set up Prometheus and Grafana for metrics