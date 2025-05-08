import axios from 'axios';

const chatWithISL = async (req, res) => {
    const { prompt } = req.body;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: `You are a helpful chatbot assistant.

User message: "${prompt}"

Reply with only one short sentence. Keep it under 2 sentences. Use clear and natural English.`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    
                    temperature: 0.1,
                    maxOutputTokens: 30
                }
            }
        );

        let reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not understand.';
        reply = reply.trim();

        // Fallback if it's too long or empty
        if (!reply || reply.split(/\s+/).length > 20) {
            reply = 'Sorry, please ask again clearly.';
        }

        res.status(200).json({ response: reply });
    } catch (error) {
        console.error('Chatbot Error:', error.message);
        res.status(200).json({ response: 'Sorry, something went wrong.' });
    }
};

export { chatWithISL };
