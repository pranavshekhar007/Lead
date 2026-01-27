const firecrawl = require('@mendable/firecrawl-js');

const FirecrawlApp = firecrawl.FirecrawlApp || firecrawl.default || firecrawl.FirecrawlAppV1;

const scrapeUrl = async (url) => {
    try {
        if (!process.env.FIRECRAWL_API_KEY) {
            throw new Error("FIRECRAWL_API_KEY is missing in environment variables");
        }

        const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

        let scrapeResult;

        // Handle different SDK versions or method names
        if (typeof app.scrapeUrl === 'function') {
            scrapeResult = await app.scrapeUrl(url, { formats: ['markdown'] });
        } else if (typeof app.scrape === 'function') {
            scrapeResult = await app.scrape(url, { formats: ['markdown'] });
        } else {
            throw new Error(`FirecrawlApp instance has no compatible scrape method.`);
        }

        if (!scrapeResult || !scrapeResult.markdown) {
            throw new Error("No markdown content received from Firecrawl.");
        }

        return scrapeResult.markdown;
    } catch (error) {
        console.error(`Error scraping URL ${url}:`, error.message);
        throw error;
    }
};

module.exports = { scrapeUrl };