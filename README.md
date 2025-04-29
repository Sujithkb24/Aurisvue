# AurisVue – Real-Time Speech-to-ISL Translator

📖 **Overview**

**AurisVue** is an AI-driven platform that translates spoken language into **Indian Sign Language (ISL)** gestures in real-time. It bridges communication between deaf individuals and the hearing community across various settings, including classrooms, online video consumption, and public interactions.

---

## 🚀 Features

### Real-Time Translation Modes

- **Class Mode**: Live classroom sessions with teacher-student sync via session codes.
- **Plugin Mode**: Browser or desktop plugin captures video/audio playback and translates to ISL.
- **Public Mode**: Mobile or web interface for on-the-fly conversations using a handheld microphone.

### 3D Avatar Animation

- Interactive avatar powered by **Three.js** rendering rigged human models from **Mixamo**.

### Additional Capabilities

- **Progress Tracking**: Track signs mastered, accuracy, and practice time.
- **Minimal Assistant Bot**: Lightweight, keyword-based chatbot for usage guidance and FAQs.
- **Session Management**: Teachers can create sessions; students join via code.
- **Customizable Playback**: Pause, replay, and adjust gesture speed.

---

## 🛠️ Tech Stack

| Layer             | Technology                        |
|------------------|-----------------------------------|
| Frontend         | React.js, Three.js, Tailwind CSS  |
| Backend          | Node.js, Express.js               |
| Real-Time Comm   | Socket.IO                         |
| Speech-to-Text   | OpenAI Whisper / Google STT       |
| 3D Models        | Mixamo (auto-rigging)             |
| Database         | MongoDB / Firebase Firestore      |
| Authentication   | Firebase Auth / JWT               |

---

## 🎯 Usage

- **Signup/Login** as Teacher or Student.
- **Teacher**: Create a class session → share session code.
- **Student**: Join session using the code.

### Modes of Use

- **Class Mode**: Live classroom translation.
- **Plugin Mode**: Translate media playing on the device.
- **Public Mode**: Use mobile mic for conversation-based translation.
- **Practice Mode**: Improve ISL skills and track personal progress.

---

## 🛠️ Development

- **Hot Reload**: Enabled on frontend and backend.
- **Linting**: ESLint + Prettier configured.
- **Testing**: Jest (frontend) + Mocha/Chai (backend).

---

## 🤝 Contributing

We welcome contributions! Please read our Code of Conduct and Contributing Guidelines.

---

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## 📫 Contact

**Project Maintainer**: Sujith (sujithkb24@gmail.com)  
**GitHub**: [Sujithkb24/AurisVue](https://github.com/Sujithkb24/AurisVue)

---

> _Where every word meets its sign._
