const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

async function testOpenAI() {
  console.log('API Key present:', !!process.env.OPENAI_API_KEY);
  console.log('API Key length:', process.env.OPENAI_API_KEY?.length);
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Say 'API is working!'"
        }
      ],
      max_tokens: 10,
    });

    console.log('Success! Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOpenAI();