const { Ollama } = require('ollama');

const ollama = new Ollama({ host: process.env.OLLAMA_API_HOST || 'http://127.0.0.1:11434' });
const MODEL_NAME = process.env.OLLAMA_API_MODEL || 'llama3.2';

const getExtractedData = async (markdown, targetFields) => {
    try {
        const fieldsJoinedString = targetFields.join(', ');
        const markdownDataTruncated = markdown.substring(0, 20000);

        const systemMessage = `You are a high-performance data extraction engine. Your goal is to extract MAXIMUM structured data from the provided text.
RULES:
1. Output ONLY a raw JSON list of objects. No Markdown, no code blocks, no text before/after.
2. PRIORITY: First, extract the 'Target Fields' requested by the user. If a target field is missing, set it to null.
3. DISCOVERY: After extracting target fields, you MUST extract any other valuable structured data found in the text (e.g., ratings, reviews, social links, specs, dates) and add them as new keys.
4. Do not ignore any valid data points. If the text contains a table or list, extract all columns/items.
5. Normalize keys to snake_case.`;

        const userMessage = `Analyze the website content below and extract a list of entities.

--- TARGET FIELDS (Priority) ---
${fieldsJoinedString}

--- INSTRUCTIONS ---
1. Extract the target fields listed above.
2. Scan the text for ANY other relevant data (e.g., if you see 'Rating: 4.5', add a 'rating' field; if you see 'In Stock', add an 'availability' field).
3. Return the maximum amount of data possible in a flat JSON object.

--- WEBSITE CONTENT ---
${markdownDataTruncated}

--- OUTPUT ---
Generate the raw JSON list now:`;

        const response = await ollama.chat({
            model: MODEL_NAME,
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userMessage },
            ],
            format: 'json',
            options: { temperature: 0.0 },
        });

        let content = response.message.content;

        content = content.replace(/```json/g, '').replace(/```/g, '');

        const firstBracket = content.indexOf('[');
        const lastBracket = content.lastIndexOf(']');

        if (firstBracket !== -1 && lastBracket !== -1) {
            content = content.substring(firstBracket, lastBracket + 1);
        }

        try {
            return JSON.parse(content);
        } catch (parseError) {
            console.error("Failed to parse JSON from LLM response:", content);
            try {
                const singleObj = JSON.parse(`[${content}]`);
                return singleObj;
            } catch (e) {
                return [];
            }
        }

    } catch (error) {
        console.error("Error in AI extraction:", error);
        throw error;
    }
};

module.exports = { getExtractedData };