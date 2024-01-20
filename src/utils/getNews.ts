import axios from 'axios';
import type { AxiosResponse } from 'axios';

// Define the type for the news item based on the provided JSON structure
type NewsItem = {
  firstSentence: string;
  title: string;
  shareURL: string;
  ressort?: string; // Optional field, adjust as necessary
  details?: string;
  detailsContent?: string; // You might want to define a more specific type here
};

// Define the type for the API response
type TagesschauResponse = {
  news: NewsItem[];
};

// Function to fetch news items from the Tagesschau API
async function getNews(): Promise<NewsItem[]> {
  try {
    const response: AxiosResponse<TagesschauResponse> = await axios.get(
      'https://www.tagesschau.de/api2/news/?regions=2&ressort=ausland',
    );

    const result = response.data.news.map(({ firstSentence, title, shareURL, ressort, details }) => ({
      firstSentence,
      title,
      shareURL,
      ressort,
      details,
    }));

    // Fetch details for each news item
    const detailsPromises = result.map(item =>
      item.details ? axios.get(item.details) : Promise.resolve(null)
    );

    const detailsResponses = await Promise.all(detailsPromises);

    /* eslint-disable*/
    // Process and append the detailed content to the news items
    const newsWithDetails = result.map((item, index) => {
      const detailsContent = detailsResponses[index]?.data.content
        ?.filter((content: { type: string }) => content.type === 'text')
        .map((content: { value: string }) => content.value)
        .filter((value: string) => !/<[^>]+>|href=/.test(value)) // Exclude HTML tags and hrefs
        .join('');
      return { ...item, detailsContent }; // Append the processed details to each item
    });
    /* eslint-enable*/


    return newsWithDetails;

  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
}

export default getNews;
