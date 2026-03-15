# 🎨 OmniaPixels - AI-Powered Image Processing Platform

## 📋 Project Overview

OmniaPixels is a comprehensive full-stack AI-powered image processing platform featuring:

- **Backend API**: FastAPI-based REST API with job queue system
- **Mobile Apps**: Flutter cross-platform and Android native apps
- **AI Processing**: Background removal, enhancement, super resolution, smart cropping
- **Infrastructure**: Docker containerization with PostgreSQL, Redis, MinIO

## 🏗️ Architecture

```
OmniaPixels/
├── omnia/                    # Backend API & Core
│   ├── api/                  # FastAPI routes & endpoints
│   ├── core/                 # Database models & config
│   ├── workers/              # Background job processors
│   ├── storage/              # MinIO S3 integration
│   ├── models/               # AI model registry
│   ├── infra/                # Docker & deployment
│   └── scripts/              # Utility scripts
├── mobile/
│   ├── omnia_flutter/        # Flutter cross-platform app
│   └── omnia_android/        # Android native app
└── models/                   # AI model checkpoints
```

## 🚀 Quick Start

### Backend Setup

1. **Install Dependencies**
```bash
cd omnia
pip install -r requirements.txt
```

2. **Start Local Development**
```bash
python scripts/start_local.py
```

3. **Initialize Database**
```bash
python scripts/init_db.py
```

4. **API Documentation**
- Swagger UI: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Docker Setup

```bash
cd omnia/infra
docker-compose up -d
```

### Mobile Apps

#### Flutter App
```bash
cd mobile/omnia_flutter
flutter pub get
flutter run
```

#### Android App
```bash
cd mobile/omnia_android
./gradlew build
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/postgres

# Redis Queue
REDIS_URL=redis://localhost:6379/0

# MinIO Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# API Settings
ALLOWED_ORIGINS=["*"]
FILE_UPLOAD_MAX_MB=20
```

## 📱 Mobile Features

### Flutter App
- ✅ Home screen with quick actions
- ✅ Image upload (camera/gallery)
- ✅ Processing type selection
- ✅ Real-time progress tracking
- ✅ Result viewing and sharing
- ✅ Firebase analytics integration

### Android App
- ✅ Jetpack Compose UI
- ✅ Hilt dependency injection
- ✅ Material Design 3
- ✅ Navigation component
- ✅ Firebase integration

## 🤖 AI Processing Types

1. **Background Removal** - Remove/replace image backgrounds
2. **Image Enhancement** - Auto-enhance image quality
3. **Super Resolution** - AI-powered upscaling (2x, 4x)
4. **Smart Crop** - Intelligent image cropping
5. **Style Transfer** - Apply artistic styles

## 🛠️ API Endpoints

```
GET  /health              # Health check
GET  /v1/models           # List AI models
GET  /v1/presets          # Get processing presets
POST /v1/jobs             # Create processing job
GET  /v1/jobs/{id}        # Get job status
DELETE /v1/jobs/{id}      # Cancel job
GET  /v1/storage/presigned_put  # Get upload URL
```

## 📊 System Status

### ✅ Completed Components

- [x] FastAPI backend with all endpoints
- [x] SQLAlchemy database models
- [x] Redis job queue system
- [x] MinIO S3 storage integration
- [x] AI model registry system
- [x] Docker Compose infrastructure
- [x] Flutter mobile app (all screens)
- [x] Android app (main components)
- [x] Database initialization scripts

### 🔄 In Progress

- [ ] AI model implementations
- [ ] Authentication system
- [ ] Production deployment
- [ ] Performance optimization

## 🧪 Testing

```bash
# Backend tests
cd omnia
python -m pytest

# Flutter tests
cd mobile/omnia_flutter
flutter test

# Android tests
cd mobile/omnia_android
./gradlew test
```

## 📦 Deployment

### Production Deployment
```bash
# Build and deploy with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### Mobile App Deployment
- **Flutter**: `flutter build apk --release`
- **Android**: `./gradlew assembleRelease`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- 📧 Email: support@omniapixels.com
- 📖 Documentation: [docs.omniapixels.com](https://docs.omniapixels.com)
- 🐛 Issues: [GitHub Issues](https://github.com/omniapixels/issues)

---

**Built with ❤️ using FastAPI, Flutter, and Android**
