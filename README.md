# Feen - منصة لم الشمل

**Feen** is an open-source platform designed to help families reunite with lost members. The name "Feen" translates to "Where" in Arabic, symbolizing the search for lost individuals. This project provides a web interface where users can report missing or found people, and the system will attempt to match individuals based on facial recognition technology.

### link to website 

https://feen-frontend.pages.dev/

## 🌟 Project Overview

Feen is built with the vision to help people in their most difficult times by providing a simple and effective way to search for missing individuals. It is designed to be easily accessible to everyone, with full Arabic language support and contributions from developers are encouraged.

## ✨ Key Features

- **Lost and Found Reports**: Users can report missing persons or found persons, and the system will attempt to find matches
- **Facial Recognition**: The core functionality relies on Face++ API facial recognition technology to match lost and found individuals
- **Arabic Language Support**: The platform supports Arabic language with RTL (Right-to-Left) interface
- **Real-time Matching**: Automated matching algorithm using demographic data and facial comparison
- **Photo Management**: Secure photo upload and storage using Cloudflare R2
- **User Authentication**: Secure JWT-based authentication system
- **Open Source**: This project is open to contributions from developers to help fix bugs, add features, and improve the system

## 🛠️ Technologies Used

### Frontend:
- **HTML5**: Semantic structure and layout
- **CSS3**: Modern styling with Tailwind CSS framework
- **JavaScript (ES6+)**: Interactive functionality and API integration
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide Icons**: Beautiful, customizable icons
- **Arabic RTL Support**: Full right-to-left language support

### Backend:
- **Cloudflare Workers**: Serverless edge computing platform
- **Hono.js**: Fast, lightweight web framework
- **TypeScript**: Type-safe JavaScript development
- **PostgreSQL**: Relational database with Prisma ORM
- **Prisma**: Modern database toolkit and ORM
- **Cloudflare R2**: Object storage for photo management
- **Face++ API**: Facial recognition and comparison service

### Development Tools:
- **Wrangler**: Cloudflare Workers development and deployment tool
- **Vitest**: Fast unit testing framework
- **Prettier**: Code formatting
- **ESLint**: Code linting and quality

## 📁 Project Structure

```
Feen-project/
├── 📁 public/                    # Frontend static files
│   ├── 📁 css/                   # Stylesheets
│   │   └── styles.css            # Custom CSS with Tailwind
│   ├── 📁 js/                    # JavaScript modules
│   │   ├── auth.js               # Authentication logic
│   │   ├── config.js             # API configuration
│   │   └── notifications.js      # Notification system
│   ├── index.html                # Landing page
│   ├── login.html                # Login page
│   ├── register.html             # Registration page
│   ├── dashboard.html            # User dashboard
│   ├── report-missing.html       # Missing person report
│   ├── report-found.html         # Found person report
│   ├── report-matches.html       # Match results
│   ├── report-details.html       # Report details
│   └── notification-test.html    # Notification testing
├── 📁 src/                       # Backend source code
│   ├── index.ts                  # Main application entry point
│   ├── common.ts                 # Shared utilities and types
│   ├── auth.ts                   # Authentication middleware
│   ├── reporters.ts              # User management
│   ├── losts.ts                  # Missing person reports
│   ├── founds.ts                 # Found person reports
│   ├── matches.ts                # Matching algorithm
│   └── data-validation.ts        # Zod validation schemas
├── 📁 prisma/                    # Database schema and migrations
│   ├── schema.prisma             # Database model definitions
│   └── 📁 migrations/            # Database migration files
├── 📁 test/                      # Test files
│   ├── index.spec.ts             # Main test suite
│   └── tsconfig.json             # Test TypeScript config
├── 📁 docs/                      # Documentation
│   └── compare.md                # Face++ API documentation
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── wrangler.toml                 # Cloudflare Workers config
└── README.md                     # This file
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following main models:

- **Reporters**: User accounts and authentication
- **Losts**: Missing person reports with photos and metadata
- **Founds**: Found person reports with discovery details
- **Match**: Potential matches between lost and found persons
- **Report**: Audit trail for all reports
- **Statistic**: System usage metrics

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account
- PostgreSQL database (or Neon serverless database)
- Face++ API account for facial recognition

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mostafaHaydar/Feen-project.git
   cd Feen-project
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   
   Create a `.dev.vars` file in the root directory:
   ```env
   JWT_SECRET_KEY="your-secret-key-here"
   DATABASE_URL="your-postgresql-connection-string"
   LOST_PHOTOS="lost-photos"
   FOUND_PHOTOS="found-photos"
   ENV="development"
   FACE_PLUS_PLUS_KEY="your-faceplusplus-api-key"
   FACE_PLUS_PLUS_SECRET="your-faceplusplus-api-secret"
   ```

   Create a `.env` file for Prisma:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   DIRECT_DATABASE_URL="your-direct-postgresql-connection-string"
   ```

4. **Database Setup**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 🚀 Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run deploy` - Deploy to production
- `npm test` - Run test suite
- `npm run cf-typegen` - Generate Cloudflare types

## 🌐 API Endpoints

### Authentication
- `POST /api/reporter/register` - User registration
- `POST /api/reporter/login` - User authentication
- `GET /api/reporter/profile` - Get user profile
- `PUT /api/reporter/profile` - Update user profile

### Missing Persons
- `POST /api/lost` - Create missing person report
- `GET /api/losts` - Get user's reports
- `GET /api/lost/:id` - Get specific report
- `PUT /api/lost/:id` - Update report
- `DELETE /api/lost/:id` - Delete report
- `POST /api/lost/:id/photo` - Upload photo

### Found Persons
- `POST /api/found` - Create found person report
- `GET /api/founds` - Get user's reports
- `GET /api/found/:id` - Get specific report
- `PUT /api/found/:id` - Update report
- `DELETE /api/found/:id` - Delete report
- `POST /api/found/:id/photo` - Upload photo

### Matching System
- `GET /api/lost-matches/:id` - Find potential matches

## 🤝 Contributing

We welcome contributions from developers! Whether you're looking to fix bugs, add features, or improve the platform, you're encouraged to get involved.

### Steps to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Zod for data validation
- Write tests for new features
- Follow the existing code style
- Update documentation as needed

## 📚 Documentation

- [Face++ API Documentation](docs/compare.md) - Facial recognition API details
- [Prisma Documentation](https://www.prisma.io/docs) - Database ORM guide
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) - Serverless platform docs
- [Hono.js](https://hono.dev/) - Web framework documentation

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you need help or have questions:
- Open an issue on GitHub
- Check the documentation
- Review the code examples

---

**Feen** - Helping families reunite, one report at a time. 🌟
