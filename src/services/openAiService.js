import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function getBibleVerses(prompt) {
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: 'You are a Christian Bible assistant.' },
            { role: 'user', content: prompt },
        ],
        // temperature: 0.5,
        temperature: 0.3,
        response_format: { type: "json_object" },
        max_tokens: 1000, // Increased token limit
        stream: false
    });

    const text = response.choices[0].message.content;

    console.log('OpenAI response text:', text);


    // Parse JSON
    const parsed = JSON.parse(text);

    // Validate structure
    if (!parsed.verses || !Array.isArray(parsed.verses)) {
        throw new Error('Invalid response structure from OpenAI');
    }

    // Validate each verse
    const validatedVerses = parsed.verses.map((verse, index) => {
        if (!verse.reference || !verse.text) {
            console.warn(`Verse ${index} missing required fields:`, verse);
            return {
                reference: verse.reference || 'Unknown',
                text: verse.text || 'Verse not available'
            };
        }
        return verse;
    });
    return {
        success: true,
        verses: validatedVerses,
        raw: text
    };
}
