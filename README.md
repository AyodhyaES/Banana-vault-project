# 🍌 Banana Mystery Vault

An interactive mystery puzzle game powered by the Banana API, built using Node.js, Express.js and MongoDB.

## Features

- Username and password registration and login
- Secure password hashing using bcrypt
- Unique Explorer ID and avatar selection
- Three adventure levels
- Coins, lives, hints and keys
- Player progress saving using MongoDB
- Player leaderboard
- Live Banana API puzzle integration
- Local practice puzzles when the API is unavailable

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- MongoDB
- Mongoose
- Banana API
- JWT Authentication

## Installation and Setup

### 1. Clone or download the project

### 2. Install dependencies

  bash
npm install


### 3. Configure environment variables

Copy `.env.example` to `.env`.

Windows PowerShell:

powershell
Copy-Item .env.example .env


Mac/Linux:

bash
cp .env.example .env


Add your configuration to `.env`:

env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/banana_vault
JWT_SECRET=your_private_secret


Use your own secure JWT secret. Never upload .env to GitHub.

### 4. Configure MongoDB

Choose one:

- **MongoDB Atlas:** Create a free cluster, configure database access and network access, and add your connection string to .env.
- **Local MongoDB:** Install MongoDB Community Server and start the MongoDB service.

### 5. Start the application

bash
npm start


Open:

http://localhost:3000

Check the database connection:

http://localhost:3000/api/health

A successful response should look like:
    json
{
  "ok": true,
  "db": true
}


## Database Information

The application stores:

- Username and username key
- Hashed password
- Explorer ID and avatar
- Coins, lives and score
- Hints and collected keys
- Unlocked and completed levels
- Best scores or times
- Account creation and update dates

## API Integration

The game uses the Banana API to retrieve puzzle questions through the Express backend. Local practice puzzles are available when the external API is unavailable.

## Security

- Passwords are hashed using bcrypt.
- Authentication uses signed HTTP-only cookies.
- Environment variables are kept outside the public repository.
- Password hashes are never sent to the browser.

## Author

Developed as an individual software development project.

## License

Add your chosen open-source license here if you intend to distribute the project under one.