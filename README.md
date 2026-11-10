# 🍌 Banana Mystery Vault

An interactive mystery puzzle adventure game powered by the Banana API. Developed using HTML5, CSS3, JavaScript, Node.js, Express.js and MongoDB.

**Live Frontend:** https://ayodhyaes.github.io/Banana-vault-project/

## ✨ Features

- Username and password registration and login
- Secure password hashing using bcrypt
- Unique Explorer ID and avatar selection
- Three adventure levels
- Coins, lives, hints and collectible keys
- Player progress saving using MongoDB
- Player leaderboard
- Live Banana API puzzle integration
- Local practice puzzles when the API is unavailable

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- Banana API
- JWT Authentication

## 🚀 Installation and Setup

### 1. Clone the repository

bash
git clone https://github.com/AyodhyaES/Banana-vault-project.git


Navigate into the project folder:

bash
cd Banana-vault-project


### 2. Install dependencies

bash
npm install


### 3. Configure environment variables

Copy .env.example to .env.

**Windows PowerShell:**

powershell
Copy-Item .env.example .env


**Mac/Linux:**

bash
cp .env.example .env


Configure your .env file:

env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/banana_vault
JWT_SECRET=your_private_secret


Use your own secure JWT secret. Never upload `.env` to GitHub.

### 4. Configure MongoDB

Use MongoDB Community Server locally or configure MongoDB Atlas with your own connection string.

### 5. Start the application

bash
npm start


Open the application:

http://localhost:3000

Check the database connection:

http://localhost:3000/api/health

Expected response:

```json
{
  "ok": true,
  "db": true
}
```

## 🗄️ Database Information

MongoDB stores:

- Username and username key
- Hashed password
- Explorer ID and avatar
- Coins, lives and score
- Hints and collected keys
- Unlocked and completed levels
- Best scores and times
- Account creation and update dates

## 🔌 API Integration

The game retrieves puzzle questions through the Banana API using the Express backend. Local practice puzzles are also available when the external API is unavailable.

## 🔐 Security

- Passwords are hashed using bcrypt.
- Authentication uses signed HTTP-only cookies.
- Environment variables are kept outside the public repository.
- Password hashes are never sent to the browser.

## 🌐 Deployment

The frontend is published using GitHub Pages.

The Node.js and Express backend requires a running server, and MongoDB requires an accessible database connection.

## 👩‍💻 Author

Developed as an individual software development project.

## 📄 License

No open-source license has been selected yet.