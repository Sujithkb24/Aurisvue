import axios from 'axios';

const chatWithGemini = async (req, res) => {
    const { prompt } = req.body;
    
    // List of words we have sign images for
    const availableSigns = [
        'hello', 'hi', 'thank', 'thanks', 'you', 'eat', 'water', 
        'sleep', 'help', 'drink', 'bye', 'goodbye', 'please', 'sorry',
        'yes', 'no', 'good', 'morning', 'night', 'name', 'my', 'your',
        'what', 'where', 'how', 'why', 'who', 'when'
    ];
    
    // Create a prompt that encourages single-word responses from available signs
    const geminiPrompt = `
        You are an Indian Sign Language (ISL) assistant. Your responses will be converted to sign language images.
        Please respond with only one word from this list when possible:
        ${availableSigns.join(', ')}
        
        If you must respond with multiple words, choose the most important single word from your response.
        Keep all responses lowercase.
        
        User query: "${prompt}"
    `;

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              contents: [{ parts: [{ text: geminiPrompt }] }],
            }
        );

        let reply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'sorry';
        
        // Clean up the response
        reply = reply.trim().toLowerCase();
        
        // Extract just the first word if multiple words returned
        const firstWord = reply.split(/\s+/)[0];
        
        // Verify the word is in our available signs or can be spelled
        if (!availableSigns.includes(firstWord)) {
            // Check if it's a simple word that can be spelled
            if (!/^[a-zA-Z]+$/.test(firstWord)) {
                reply = 'sorry';
            } else {
                reply = firstWord;
            }
        } else {
            reply = firstWord;
        }

        res.status(200).json({ response: reply });
    } catch (error) {
        console.error('Gemini Error:', error.message);
        // Return a word we definitely have a sign for
        res.status(200).json({ response: 'sorry' });
    }
};

export { chatWithGemini };