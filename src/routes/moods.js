const openAiService = require('../services/openAiService.js');
const Reflection = require('../models/Reflection');
const redis = require('../config/redis');
const { cachedFetch } = require('../utils');

module.exports = [
  {
    method: 'GET',
    path: '/bible/api/moods',
    handler: () => {
      return {
        data: [
          { id: 1, name: 'Anxious', emoji: '😰' },
          { id: 2, name: 'Stressed', emoji: '😫' },
          { id: 3, name: 'Confused', emoji: '😕' },
          { id: 4, name: 'Sad', emoji: '😢' },
          { id: 5, name: 'Hopeful', emoji: '😊' },
          { id: 6, name: 'Regret', emoji: '😔' },
          { id: 7, name: 'Lost', emoji: '🫣' },
          { id: 8, name: 'Betrayed', emoji: '😠' },
        ],
      };
    },
  },
  {
    method: 'POST',
    path: '/bible/api/moods/verses/recommend',
    handler: async (request) => {
      const { mood, thought } = request.payload;

      const prompt = `
You are a Bible assistant for Fellowship AI App.

The user feels: ${mood}
The user is thinking: "${thought}"

Return EXACTLY 4 Bible verses that provide encouragement and comfort.

IMPORTANT RULES:
          1. Return ONLY valid JSON, no other text
          2. Keep verse texts CONCISE (max 250 characters)
          3. Schema: {"verses":[{"reference":"string","text":"string"}]}
          4. Ensure all strings are properly escaped and terminated.

Example Response:
{
  "verses": [
    {
      "reference": "Psalm 34:17-18",
      "text": "The righteous cry out, and the Lord hears them; he delivers them from all their troubles. The Lord is close to the brokenhearted and saves those who are crushed in spirit."
    },
    {
      "reference": "Isaiah 41:10",
      "text": "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand."
    },
    {
      "reference": "Matthew 11:28-30",
      "text": "Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls. For my yoke is easy and my burden is light."
    },
    {
      "reference": "Philippians 4:6-7",
      "text": "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus."
    }
  ]
} 
`;

      const response = await openAiService.getBibleVerses(prompt);
      return {
        data: response.verses,
      };
    },
  },
  {
    method: 'POST',
    path: '/bible/api/moods/reflections',
    handler: async (request, h) => {
      try {
        const { reflection, selectedFeeling, mood, thought, userId } = request.payload;

        const newReflection = new Reflection({
          reflectionText: reflection,
          selectedFeeling: selectedFeeling,
          mood: mood,
          thought: thought,
          userId: userId
        });

        const savedReflection = await newReflection.save();

        return h.response({
          success: true,
          message: 'Reflection saved successfully.',
          data: savedReflection
        }).code(201); // 201 Created status

      } catch (error) {
        console.error('Error saving reflection:', error);
        return h.response({
          success: false,
          message: 'Failed to save reflection.'
        }).code(500);
      }
    }
  },
  {
    method: 'GET',
    path: '/bible/api/moods/reflections/{userId}',
    handler: async (req) => {
      const { userId } = req.params;
      const { month, year } = req.query;

      try {
        // Set defaults to current month if not provided
        const currentDate = new Date();
        const queryYear = parseInt(year) || currentDate.getFullYear();
        const queryMonth = parseInt(month) || (currentDate.getMonth() + 1);

        // Validate month is between 1-12
        const validMonth = Math.max(1, Math.min(12, queryMonth));

        // Create valid date range
        const startDate = new Date(queryYear, validMonth - 1, 1);
        const endDate = new Date(queryYear, validMonth, 0); // Last day of the month

        // Validate dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return {
            success: false,
            message: 'Invalid date parameters'
          };
        }
        const reflections = await Reflection.find({
          userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: -1 });

        // Group by date to get latest mood per day
        const groupedByDate = {};
        reflections.forEach(reflection => {
          const date = reflection.dateString ||
            reflection.createdAt.toISOString().split('T')[0];

          // Only keep the latest reflection for each day
          if (!groupedByDate[date] ||
            reflection.createdAt > groupedByDate[date].createdAt) {
            groupedByDate[date] = reflection;
          }
        });

        return {
          success: true,
          data: groupedByDate,
          meta: {
            month: validMonth,
            year: queryYear,
            totalReflections: reflections.length,
            uniqueDays: Object.keys(groupedByDate).length
          }
        };

      } catch (error) {
        console.error('Error fetching calendar reflections:', error);
        return {
          success: false,
          message: 'Failed to fetch reflections',
          error: error.message
        };
      }
    }
  },
]
