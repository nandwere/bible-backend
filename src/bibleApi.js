
// src/bibleApi.js
const axios = require('axios');

module.exports = axios.create({
  baseURL: 'https://rest.api.bible/v1/',
  headers: {
    'api-key': process.env.BIBLE_API_KEY
  }
});

