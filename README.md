AurisVue – Real-Time Speech-to-ISL Translator

📖 Overview

AurisVue is an AI-driven platform that translates spoken language into Indian Sign Language (ISL) gestures in real-time. It bridges communication between deaf individuals and the hearing community across various settings, including classrooms, online video consumption, and public interactions.

🚀 Features

Real-Time Translation Modes

Class Mode: Live classroom sessions with teacher-student sync via session codes.

Plugin Mode: Browser or desktop plugin captures video/audio playback and translates to ISL.

Public Mode: Mobile or web interface for on-the-fly conversations using a handheld microphone.

3D Avatar Animation: Interactive avatar powered by Three.js rendering rigged human models (Mixamo).

Progress Tracking: Optional learning mode that tracks signs mastered, accuracy, and practice time.

Minimal Assistant Bot: Lightweight keyword-based chatbot for usage guidance and FAQs.

Session Management: Teachers can create/join sessions; students join via code.

Customizable Playback: Controls for pausing, replaying, and adjusting gesture speed.

🛠️ Tech Stack

Layer

Technology

Frontend

React.js, Three.js, Tailwind CSS

Backend

Node.js, Express.js

Real-Time Comm

Socket.IO

Speech-to-Text

OpenAI Whisper / Google Speech-to-Text

3D Models

Mixamo (auto-rigging)

Database

MongoDB / Firebase Firestore

Auth

Firebase Auth / JWT

📂 Repository Structure

├── frontend/                # React application
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # UI & Bot widget
│       ├── pages/           # Route components (Home, Class, Plugin, Public)
│       ├── services/        # API & socket services
│       ├── models/          # Three.js avatar loader & animation handlers
│       └── App.jsx
├── backend/                 # Node.js + Express server
│   ├── controllers/         # Route handlers (auth, sessions, translation)
│   ├── models/              # Mongoose / Firestore schemas
│   ├── routes/              # Express routes
│   ├── services/            # STT & ISL mapping logic
│   └── app.js               # Server entry point
├── assets/                  # Logos, README images
├── docs/                    # Design docs & user flows
├── .env.example             # Environment configuration template
├── package.json
└── README.md                # Project overview (you are here)

⚙️ Installation & Setup

Clone the repository

git clone https://github.com/Sujithkb24/AurisVue.git
cd AurisVue

Backend

cd backend
npm install
cp .env.example .env      # Set your environment variables
npm run start             # Starts backend on http://localhost:5000

Frontend

cd ../frontend
npm install
npm run dev               # Starts frontend on http://localhost:3000

🎯 Usage

Signup / Login as Teacher or Student.

Teacher: Create a Class Session → share session code.

Student: Join session using code.

Modes:

Class Mode: Live lecture translation.

Plugin Mode: Enable plugin to capture and translate video/audio.

Public Mode: Use mobile mic for on-the-fly translation.

Practice & Progress: Switch to Practice Mode to hone ASL skills and track progress.

🛠️ Development

Hot Reload: Frontend and backend support hot reload for rapid iteration.

Linting & Formatting: ESLint and Prettier configured.

Testing: Jest (frontend) and Mocha/Chai (backend).

Contributing: Please see CONTRIBUTING.md.

🤝 Contributing

We welcome contributions! Please read our Code of Conduct and Contributing Guidelines first.

📄 License

This project is licensed under the MIT License. See LICENSE for details.

📫 Contact

Project Maintainer: Sujith (sujithkb24@gmail.com)

GitHub: Sujithkb24/AurisVue

Bridging languages, one sign at a time.
