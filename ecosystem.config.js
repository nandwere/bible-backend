module.exports = {
  apps: [{
    name: "bible-app-backend",
    script: "./src/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
