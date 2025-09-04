# Video Interview Platform

A comprehensive AI-powered video interview management system built with Next.js, Node.js, and a hybrid cloud architecture. This enterprise-grade platform enables HR teams to create interview templates with intelligent keyword matching, send automated video interview invitations to candidates, and review submitted video responses with professional evaluation tools and automatic AI scoring.

## 🚀 Features

### Admin Features
- **User Authentication** - Secure JWT-based login system with bcryptjs encryption
- **Enhanced Dashboard** - Full-width responsive layout with advanced template management and candidate overview
- **Template Management** - Create, edit, and delete custom interview templates with multiple questions, time limits, and AI keywords
- **AI Keyword System** - Define weighted keywords for automatic candidate scoring across categories (Technical, Soft Skills, Experience)
- **Automated Email Notifications** - Send professional interview invitations via SendGrid with beautiful HTML templates
- **Advanced Candidate Management** - Track candidate progress with sortable tables, advanced filtering, search, and pagination
- **Professional Video Review** - Advanced video player with instant streaming, download, and evaluation tools
- **AI-Powered Analysis** - Automatic speech-to-text transcription with keyword matching and scoring
- **Transcript Display** - View complete transcripts of candidate responses with confidence scores
- **Keyword Matching** - Real-time display of found keywords with match counts and category breakdowns
- **Evaluation System** - Star ratings and notes for each interview question with persistence
- **Advanced Filtering & Search** - Filter by status, date range, template, with apply/reset functionality
- **Data Tables** - Sortable columns, pagination, and professional table interfaces
- **Template Deletion** - Secure template deletion with type-to-confirm safety measures
- **Progress Tracking** - Real-time tracking of candidate interview completion and transcription status

### Candidate Features
- **Secure Interview Access** - Unique session URLs with 24-hour expiration
- **Professional Video Recording** - WebRTC recording with VP9/Opus codecs and time limits
- **Question Progression** - Sequential interview flow with visual progress indicators
- **Session Management** - Automatic validation, progress tracking, and completion handling
- **Double-Click Protection** - Prevents question skipping from rapid button clicking
- **High-Quality Video** - 1280x720 HD recording at 30fps for professional presentation

### AI & Machine Learning Features
- **Speech-to-Text Transcription** - Automatic conversion of video responses to text using Google Cloud Speech API
- **FFmpeg Audio Extraction** - Professional audio processing for optimal transcription quality
- **Advanced Keyword Matching** - Intelligent keyword detection with distinct counting (not frequency-based)
- **Multi-Category Scoring** - Separate scores for Technical skills, Soft Skills, and Experience
- **Weighted Keywords** - Customizable importance levels (1x to 5x) for different keywords
- **Confidence Scoring** - Transcription confidence levels and overall candidate match percentages
- **Real-Time Analysis** - Automatic processing and scoring as soon as videos are uploaded
- **Improved Scoring Algorithm** - Distinct keyword counting prevents score inflation from repetition

### Technical Features
- **Hybrid Cloud Architecture** - Cloudflare R2 for video streaming + Snowflake for data analytics
- **Instant Video Streaming** - Direct CDN delivery with global edge locations
- **Video Pipeline** - Automatic R2 upload with optimized streaming and minimal latency
- **Audio Processing** - FFmpeg integration for professional audio extraction and processing
- **Email Integration** - SendGrid with beautiful HTML templates and delivery tracking
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS v4
- **TypeScript** - Full type safety across frontend and backend
- **Modern Tech Stack** - Next.js 15, React 19, Express 5 with latest features
- **Automatic Cleanup** - Intelligent temp file management with periodic cleanup
- **Connection Pooling Ready** - Optimized for high-performance database connections

## 🛠 Technology Stack

### Frontend
- **Framework:** Next.js 15.3.4 with App Router and Turbopack
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Language:** TypeScript 5
- **Development:** Turbopack bundler for fast development

### Backend
- **Runtime:** Node.js with Express 5.1.0
- **Database:** Snowflake (enterprise data warehouse)
- **Video Storage:** Cloudflare R2 with global CDN
- **Authentication:** JWT with bcryptjs (24-hour expiry)
- **Email Service:** SendGrid integration with HTML templates
- **File Uploads:** Multer middleware with temp storage
- **Security:** Helmet, CORS, input validation
- **Language:** TypeScript 5.8.3

### AI & Audio Processing
- **Speech-to-Text:** Google Cloud Speech-to-Text API with enhanced models
- **Audio Processing:** FFmpeg with fluent-ffmpeg for video-to-audio conversion
- **Audio Format:** LINEAR16 PCM at 16kHz for optimal transcription quality
- **Keyword Matching:** Custom algorithm with distinct counting and category-based scoring
- **Text Analysis:** Real-time transcript processing and keyword extraction

### Cloud Infrastructure
- **Video Storage:** Cloudflare R2 Object Storage
- **CDN:** Automatic global distribution via Cloudflare
- **Database:** Snowflake data warehouse for analytics
- **Email:** SendGrid cloud service
- **Speech API:** Google Cloud Speech-to-Text

## 📋 Prerequisites

- Node.js 18+ 
- Cloudflare account with R2 enabled
- Snowflake account with database access
- SendGrid account with verified sender email
- Google Cloud Platform account with Speech-to-Text API enabled
- FFmpeg binary (automatically installed via @ffmpeg-installer/ffmpeg)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd video-interview-platform
```

### 2. Backend Setup
```bash
cd backend
npm install
npm install @sendgrid/mail @google-cloud/speech fluent-ffmpeg @ffmpeg-installer/ffmpeg
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

Create `backend/.env`:
```env
# Application Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# JWT Secret (generate a strong secret)
JWT_SECRET=your_jwt_secret_here

# Snowflake Configuration
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USERNAME=your_username  
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=VIDEO_INTERVIEWS
SNOWFLAKE_SCHEMA=MAIN
SNOWFLAKE_WAREHOUSE=COMPUTE_WH

# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_BUCKET_NAME=video-interviews-prod
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# File Upload Configuration
MAX_FILE_SIZE=100MB
UPLOAD_PATH=./uploads

# Email Configuration (SendGrid)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
FROM_EMAIL=noreply@sendgrid.net  # Use SendGrid domain for better deliverability
FROM_NAME=Your Company Name

# Google Cloud Speech-to-Text Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_SPEECH_KEY_PATH=./google-speech-key.json
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 4. Cloudflare R2 Setup

1. **Create R2 Bucket** at https://dash.cloudflare.com → R2 Object Storage
2. **Generate R2 Token** with read/write permissions
3. **Enable Public Development URL** in bucket settings
4. **Configure CORS Policy**:
```json
{
  "AllowedOrigins": ["http://localhost:3000"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"]
}
```

### 5. Google Cloud Setup

1. **Create Google Cloud Project** at https://console.cloud.google.com
2. **Enable Speech-to-Text API** in the project
3. **Create Service Account** with Editor permissions
4. **Download JSON key** and save as `backend/google-speech-key.json`
5. **Add to .gitignore** to keep credentials secure

### 6. Database Setup

Run these SQL commands in your Snowflake database:

```sql
-- Core user management
CREATE TABLE users (
  id STRING,
  email STRING UNIQUE NOT NULL,
  password_hash STRING NOT NULL,
  first_name STRING NOT NULL,
  last_name STRING NOT NULL,
  role STRING DEFAULT 'recruiter',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Interview template system
CREATE TABLE interview_templates (
  id STRING,
  title STRING NOT NULL,
  description TEXT,
  created_by STRING NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE interview_questions (
  id STRING,
  template_id STRING NOT NULL,
  question_text TEXT NOT NULL,
  time_limit INTEGER DEFAULT 90,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- AI Keyword system
CREATE TABLE template_keywords (
  id STRING,
  template_id STRING NOT NULL,
  keyword STRING NOT NULL,
  category STRING DEFAULT 'general',
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL
);

-- Candidate session management
CREATE TABLE interview_sessions (
  id STRING,
  template_id STRING NOT NULL,
  candidate_email STRING NOT NULL,
  candidate_name STRING NOT NULL,
  status STRING DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Progress tracking system
CREATE TABLE session_progress (
  session_id STRING NOT NULL,
  question_id STRING NOT NULL,
  attempts_used INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  last_attempt_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Video storage and metadata (UPDATED FOR R2)
CREATE TABLE video_responses (
  id STRING,
  session_id STRING NOT NULL,
  question_id STRING NOT NULL,
  file_name STRING NOT NULL,
  stage_path STRING,          -- DEPRECATED: Legacy Snowflake path
  r2_key STRING,              -- NEW: R2 object key
  r2_url STRING,              -- NEW: R2 streaming URL
  file_size_bytes INTEGER,
  mime_type STRING,
  upload_status STRING DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- AI Transcription system
CREATE TABLE video_transcripts (
  id STRING,
  video_response_id STRING NOT NULL,
  session_id STRING NOT NULL,
  question_id STRING NOT NULL,
  transcript_text TEXT NOT NULL,
  confidence_score FLOAT,
  word_count INTEGER,
  processing_status STRING DEFAULT 'pending',
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Keyword matching results
CREATE TABLE keyword_matches (
  id STRING,
  transcript_id STRING NOT NULL,
  keyword_id STRING NOT NULL,
  match_count INTEGER DEFAULT 1,
  match_positions TEXT,
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- AI Scoring system
CREATE TABLE session_keyword_scores (
  id STRING,
  session_id STRING NOT NULL,
  template_id STRING NOT NULL,
  overall_score FLOAT,
  technical_score FLOAT,
  soft_skills_score FLOAT,
  experience_score FLOAT,
  total_keywords_found INTEGER,
  total_keywords_possible INTEGER,
  score_breakdown TEXT,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP
);

-- Evaluation system
CREATE TABLE question_evaluations (
  id STRING,
  session_id STRING NOT NULL,
  question_id STRING NOT NULL,
  rating INTEGER,
  notes TEXT,
  evaluated_by STRING NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
```

### 7. SendGrid Setup

1. **Create SendGrid account** at [sendgrid.com](https://sendgrid.com)
2. **Create API Key** with "Mail Send: Full Access" permissions
3. **Verify sender email** via Single Sender Verification
4. **Important:** Use `noreply@sendgrid.net` as FROM_EMAIL for better deliverability
5. **Add credentials** to your `.env` file

## 🏃‍♂️ Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend  
npm run dev
```

### Production Mode

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## 🌐 Application URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health
- **R2 Test:** http://localhost:5000/api/video/test-r2

## 👤 Demo Credentials

For testing purposes:
- **Email:** test@company.com
- **Password:** password123

## 🏗 Architecture Overview

### Hybrid Cloud Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare R2 │    │   Your Backend  │    │   Snowflake DB  │
│                 │    │                 │    │                 │
│ • Video Storage │◄──►│ • Business Logic│◄──►│ • User Data     │
│ • Global CDN    │    │ • AI Processing │    │ • Templates     │
│ • Instant Stream│    │ • Transcription │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Complete Workflow
1. **Admin creates template** → Questions, keywords, and weights stored in Snowflake
2. **Admin sends invitation** → Automated email via SendGrid with unique session URL
3. **Candidate receives email** → Professional HTML template with interview instructions
4. **Candidate accesses interview** → Session validated, questions loaded, progress tracked
5. **Candidate records videos** → WebRTC capture → Upload to R2 → Instant global availability
6. **AI processes videos** → FFmpeg extracts audio → Google Speech transcribes → Keywords matched with distinct counting
7. **Admin reviews videos** → Enhanced dashboard → Stream instantly from R2 CDN → View transcripts → See AI scores → Evaluate with ratings
8. **Evaluations persist** → Stored in Snowflake with update capabilities

### Video Processing Pipeline
```
WebRTC Recording (VP9/Opus) → R2 Upload → Global CDN Distribution → 
FFmpeg Audio Extraction → Google Speech API → Transcript + Keywords → 
Instant Streaming → Admin Review Interface
```

## 💰 Cost Breakdown

### Cloudflare R2 (Video Storage)
- **Storage:** $0.015/GB per month
- **Class A Operations (uploads):** First 1M free, then $4.50/1M
- **Class B Operations (downloads):** First 10M free, then $0.36/1M  
- **Egress:** First 10GB free, then $0.09/GB

**Example costs for 5,000 videos/month (4MB each):**
- Storage (20GB): $0.30/month
- Operations: $0.00/month (within free tier)
- Egress (60GB): $4.50/month
- **Total: ~$4.80/month**

### Google Cloud Speech-to-Text
- **Free Tier:** 60 minutes per month
- **Paid:** $0.006 per 15 seconds (~$0.024 per minute)
- **Example:** 100 interviews/month × 2 minutes = ~$4.80/month

### Snowflake (Data Storage)
- **Pay-per-query model** with automatic scaling
- **Compressed analytics data** - much cheaper than video storage

### SendGrid Email
- **Free Tier:** 100 emails/day
- **Paid:** Volume-based pricing for higher usage

## 🧪 Testing

### Complete End-to-End Test
1. **Login** to admin dashboard with demo credentials
2. **Create template** with multiple questions, keywords, and varying weights
3. **Send invitation** to real email address (check SendGrid activity)
4. **Receive email** and click interview link
5. **Complete interview** by recording video responses (test double-click protection)
6. **Wait for AI processing** (transcription + keyword matching)
7. **Review videos** with enhanced dashboard and instant R2 streaming
8. **View transcripts** and keyword matches in real-time
9. **Evaluate responses** with star ratings and detailed notes
10. **Test dashboard features** - enhanced layout, sorting, filtering, search, pagination
11. **Verify AI scoring** accuracy with distinct keyword detection

### Dashboard Testing
- **Enhanced Layout**: Test full-width responsive design with sidebar and main content
- **Template Management**: Create, edit, delete templates with rich details view
- **Sorting**: Click column headers to test sort functionality
- **Filtering**: Use status, template, and date filters with apply/reset
- **Search**: Test candidate name, email, and interview title search
- **Pagination**: Navigate between pages with large datasets

### Video Streaming Testing
- **R2 Streaming**: Verify instant video playback from global CDN
- **Cross-network**: Test from different networks (office vs home)
- **Firewall compatibility**: Verify corporate firewall access

## 🚀 Deployment

### Production Checklist
- [ ] Update environment variables for production domains
- [ ] Configure Cloudflare R2 with custom domain for corporate firewall compatibility
- [ ] Set up Snowflake production database with proper access controls
- [ ] Configure Google Cloud production project with billing
- [ ] Update CORS origins for production URLs
- [ ] Set NODE_ENV=production
- [ ] Configure SSL certificates and HTTPS
- [ ] Set up monitoring, logging, and error tracking
- [ ] Implement backup strategy for Snowflake data
- [ ] Configure R2 lifecycle policies for old video cleanup
- [ ] Set up AI processing monitoring and alerting
- [ ] Enable automatic temp file cleanup in production

### Performance Optimization
- Cloudflare R2 automatic global CDN distribution
- Snowflake warehouse auto-scaling for AI processing
- Audio processing pipeline optimization
- Email template optimization for deliverability
- Frontend code splitting and lazy loading
- AI processing queue management
- Enhanced dashboard with optimized rendering

## 🔧 Corporate Firewall Configuration

If videos don't load due to corporate firewalls, request IT to whitelist:

**Domain:** `*.r2.dev`  
**Specific URL:** `pub-[your-account-id].r2.dev`  
**Purpose:** Business video streaming for HR interview platform  
**Traffic:** HTTPS (port 443) outbound requests and inbound responses  
**Similar to:** YouTube, Teams recordings, Vimeo business content

**Alternative:** Set up custom domain (e.g., `videos.yourcompany.com`) pointing to R2 for better firewall compatibility.

## 🔮 Future Enhancements

### Advanced AI Features
- **Sentiment Analysis** - Detect candidate emotions and confidence levels
- **Facial Expression Analysis** - Non-verbal communication insights
- **Voice Analysis** - Pace, tone, and speaking patterns
- **Bias Detection** - Flag potentially biased evaluation patterns
- **Predictive Scoring** - ML models to predict candidate success
- **Auto-categorization** - Classify responses by topic and quality

### Enhanced User Experience
- **Real-time Transcription** - Live captions during video review
- **Keyword Highlighting** - Visual emphasis of matched terms in transcripts
- **Smart Recommendations** - AI-suggested interview questions based on role
- **Advanced Analytics** - Comprehensive reporting and insights dashboard
- **Mobile App** - React Native application for on-the-go interviews
- **Bulk Operations** - Mass candidate management and template operations

### Enterprise Features
- **SSO Integration** - Active Directory and SAML support
- **Multi-tenant Architecture** - Support for multiple organizations
- **Advanced Permissions** - Role-based access control
- **Audit Logging** - Comprehensive activity tracking
- **API Webhooks** - Integration with HR systems
- **White-label Branding** - Custom company branding

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support & Troubleshooting

### Common Issues

#### Video Streaming
- **Videos not loading**: Check corporate firewall settings for `*.r2.dev` domain
- **Slow video loading**: Verify R2 public development URL is enabled
- **CORS errors**: Check R2 bucket CORS policy configuration

#### Authentication & Email
- **Email not delivered**: Check SendGrid activity dashboard and use `noreply@sendgrid.net` as FROM_EMAIL
- **Authentication errors**: Check JWT secret configuration and token expiry

#### AI Processing
- **Transcription errors**: Check Google Cloud Speech API quotas and credentials
- **Audio extraction failures**: Ensure FFmpeg binary is properly installed
- **Keyword scoring issues**: Verify keyword categories and check distinct counting algorithm

#### Database & Storage
- **Database connection**: Verify Snowflake credentials and network access
- **R2 upload failures**: Check Cloudflare R2 API credentials and bucket permissions

#### Dashboard & UI
- **Layout issues**: Verify Tailwind CSS classes and responsive design
- **Search cursor jumping**: Use apply/reset buttons instead of live search
- **Sorting not working**: Check that table headers are clickable
- **Filters not applying**: Click "Apply Filters" button after making changes

### Debug Steps
1. Check browser console for frontend errors
2. Monitor backend server logs for API errors
3. Verify all environment variables are properly loaded
4. Test R2 connection: `GET /api/video/test-r2`
5. Confirm Snowflake database connection and schema
6. Validate Google Cloud Speech API configuration
7. Check FFmpeg installation and audio processing
8. Monitor email delivery rates and timing

### Performance Monitoring
- Backend API response times
- Video upload/streaming speeds from R2 CDN
- Audio processing and transcription duration
- Email delivery rates and timing
- Database query performance
- AI processing accuracy and speed
- Enhanced dashboard rendering performance

---

**Built with ❤️ using cutting-edge web technologies, hybrid cloud architecture, and AI for enterprise-grade video interview management.**

*Last updated: August 2025 - Hybrid R2 + Snowflake architecture with enhanced dashboard, instant video streaming, and improved candidate experience*