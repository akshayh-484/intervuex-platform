/**
 * Dynamic Question Generator Service
 * Generates follow-up questions based on candidate's answers using AI
 */

import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Generate next question based on previous answer
 * Ensures uniqueness and progressive difficulty
 */
export const generateNextQuestion = async (previousQuestion, candidateAnswer, candidateProfile, previousAnswers = [], questionHistory = [], baseDifficulty = 'medium') => {
  try {
    if (!openai) {
      return generateFallbackQuestion(previousQuestion, candidateAnswer, previousAnswers, baseDifficulty);
    }

    const currentQuestionNumber = previousAnswers.length + 1;
    const difficultyLevel = getDifficultyLevel(currentQuestionNumber, candidateAnswer, baseDifficulty);

    const prompt = `You are an expert technical interviewer conducting a ${difficultyLevel} difficulty interview.

Candidate Profile:
- Skills: ${candidateProfile.skills?.join(', ') || 'Not specified'}
- Experience: ${candidateProfile.experience || 'Not specified'}
- Current Question Number: ${currentQuestionNumber} of 10

Previous Question: ${previousQuestion}

Candidate's Answer: ${candidateAnswer}

Questions Already Asked (DO NOT REPEAT):
${questionHistory.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CRITICAL REQUIREMENTS:
1. Generate a COMPLETELY UNIQUE question - DO NOT repeat or rephrase any previous question
2. Difficulty: ${difficultyLevel} - make it ${difficultyLevel === 'hard' ? 'challenging with edge cases' : difficultyLevel === 'medium' ? 'moderately complex' : 'foundational'}
3. Build upon their previous answer to test deeper understanding
4. Focus on ${candidateProfile.skills?.[0] || 'technical'} skills
5. Include specific scenarios or edge cases
6. Test problem-solving and critical thinking
7. Make it progressively harder than question ${currentQuestionNumber - 1}

Generate ONE unique, ${difficultyLevel} technical question that:
- Tests advanced concepts if answer was good
- Probes weak areas if answer was poor
- Includes real-world scenarios
- Requires detailed technical knowledge
- Is completely different from all previous questions

Return ONLY the question text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical interviewer. Generate unique, progressively challenging questions. Never repeat questions. Focus on ${difficultyLevel} difficulty level. Test deep technical knowledge and problem-solving skills.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9, // Higher temperature for more variety
      max_tokens: 250,
      presence_penalty: 0.8, // Discourage repetition
      frequency_penalty: 0.8 // Encourage diversity
    });

    const question = response.choices[0].message.content.trim();

    // Verify uniqueness
    const isUnique = !questionHistory.some(q => 
      q.toLowerCase().includes(question.toLowerCase().substring(0, 50)) ||
      question.toLowerCase().includes(q.toLowerCase().substring(0, 50))
    );

    if (!isUnique) {
      console.warn('Generated question too similar, using fallback');
      return generateFallbackQuestion(previousQuestion, candidateAnswer, previousAnswers);
    }

    return {
      id: `dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question,
      type: 'technical',
      difficulty: difficultyLevel,
      generatedFrom: previousQuestion,
      questionNumber: currentQuestionNumber,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Dynamic question generation error:', error);
    return generateFallbackQuestion(previousQuestion, candidateAnswer, previousAnswers, baseDifficulty);
  }
};

/**
 * Determine difficulty level based on question number and answer quality.
 * Respects the initial session difficulty so hard sessions stay hard.
 */
const getDifficultyLevel = (questionNumber, answer, baseDifficulty = 'medium') => {
  const quality = analyzeAnswerQuality(answer).quality;

  if (baseDifficulty === 'easy') {
    return questionNumber <= 5 ? 'easy' : quality === 'excellent' ? 'medium' : 'easy';
  }
  if (baseDifficulty === 'hard') {
    return questionNumber <= 3 ? 'hard' : quality === 'poor' ? 'medium' : 'hard';
  }
  // medium (default)
  if (questionNumber <= 3) return quality === 'excellent' ? 'medium' : 'easy';
  if (questionNumber <= 7) return quality === 'excellent' ? 'hard'   : 'medium';
  return 'hard';
};

/**
 * Assess difficulty level based on answer quality
 */
const assessDifficulty = (answer) => {
  const length = answer.length;
  const hasCodeExample = /```|code|function|class/.test(answer.toLowerCase());
  const hasTechnicalTerms = /algorithm|complexity|optimization|architecture/.test(answer.toLowerCase());

  if (length > 300 && (hasCodeExample || hasTechnicalTerms)) {
    return 'hard';
  } else if (length > 150) {
    return 'medium';
  } else {
    return 'easy';
  }
};

/**
 * Generate fallback question when AI is not available
 * Ensures uniqueness and progressive difficulty
 */
const generateFallbackQuestion = (previousQuestion, candidateAnswer, previousAnswers = [], baseDifficulty = 'medium') => {
  const questionNumber = previousAnswers.length + 1;
  const difficulty = getDifficultyLevel(questionNumber, candidateAnswer, baseDifficulty);
  const hardQuestions = [
    "Explain the differences between TCP and UDP protocols. In what scenarios would you choose one over the other, and why?",
    "Design a scalable microservices architecture for an e-commerce platform handling 1 million requests per day. What are the key considerations?",
    "How would you implement a distributed caching system? Discuss cache invalidation strategies and consistency models.",
    "Explain the CAP theorem and provide real-world examples of systems that prioritize different aspects (CP, AP, CA).",
    "Design a rate limiting system that can handle 10,000 requests per second. What data structures and algorithms would you use?",
    "How would you detect and prevent SQL injection attacks in a web application? Provide code examples.",
    "Explain the differences between horizontal and vertical scaling. When would you use each approach?",
    "Design a real-time notification system for a social media platform with millions of users. How would you ensure reliability?",
    "How would you implement a distributed transaction across multiple microservices? Discuss the two-phase commit protocol.",
    "Explain how garbage collection works in your preferred programming language. What are the different GC algorithms?"
  ];

  const mediumQuestions = [
    "What is the difference between synchronous and asynchronous programming? Provide examples of when to use each.",
    "Explain how RESTful APIs work. What are the key principles and HTTP methods?",
    "How would you optimize a slow database query? What tools and techniques would you use?",
    "Explain the concept of dependency injection. Why is it useful in software development?",
    "What are design patterns? Describe the Singleton, Factory, and Observer patterns with examples.",
    "How does authentication differ from authorization? Implement a basic JWT authentication system.",
    "Explain the MVC (Model-View-Controller) architecture pattern. What are its advantages?",
    "What is the difference between SQL and NoSQL databases? When would you use each?",
    "How would you implement pagination for a large dataset? Discuss offset vs cursor-based pagination.",
    "Explain the concept of middleware in web frameworks. Provide practical use cases."
  ];

  const easyQuestions = [
    "What is the difference between a class and an object in object-oriented programming?",
    "Explain what an API is and why it's important in modern software development.",
    "What is version control? Why is it important for software development teams?",
    "Describe the difference between frontend and backend development.",
    "What is the purpose of a database index? How does it improve query performance?",
    "Explain what CRUD operations are and provide examples.",
    "What is the difference between GET and POST HTTP methods?",
    "Describe what responsive web design means and why it's important.",
    "What is the purpose of unit testing? Why is it important?",
    "Explain what a variable is and the difference between var, let, and const in JavaScript."
  ];

  // Select question pool based on question number
  let questionPool;
  if (questionNumber <= 3) {
    questionPool = easyQuestions;
  } else if (questionNumber <= 6) {
    questionPool = mediumQuestions;
  } else {
    questionPool = hardQuestions;
  }

  // Filter out already asked questions
  const availableQuestions = questionPool.filter(q => 
    !previousAnswers.some(prev => prev.toLowerCase().includes(q.toLowerCase().substring(0, 30)))
  );

  // If all questions used, use hard questions
  const finalPool = availableQuestions.length > 0 ? availableQuestions : hardQuestions;
  
  // Select random question from available pool
  const randomQuestion = finalPool[Math.floor(Math.random() * finalPool.length)];

  return {
    id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    question: randomQuestion,
    type: 'technical',
    difficulty,
    generatedFrom: previousQuestion,
    questionNumber,
    timestamp: new Date().toISOString()
  };
};

/**
 * Analyze answer quality for scoring
 */
export const analyzeAnswerQuality = (answer) => {
  const metrics = {
    length: answer.length,
    hasStructure: /\n|bullet|point|first|second|finally/.test(answer.toLowerCase()),
    hasTechnicalDepth: /because|therefore|however|specifically|implementation/.test(answer.toLowerCase()),
    hasExamples: /example|instance|such as|like/.test(answer.toLowerCase()),
    hasCodeOrPseudocode: /```|code|function|class|method/.test(answer.toLowerCase())
  };

  let score = 0;
  if (metrics.length > 100) score += 20;
  if (metrics.length > 200) score += 10;
  if (metrics.hasStructure) score += 20;
  if (metrics.hasTechnicalDepth) score += 25;
  if (metrics.hasExamples) score += 15;
  if (metrics.hasCodeOrPseudocode) score += 10;

  return {
    score: Math.min(score, 100),
    metrics,
    quality: score >= 70 ? 'excellent' : score >= 50 ? 'good' : score >= 30 ? 'fair' : 'poor'
  };
};

/**
 * Generate speech-to-text using OpenAI Whisper API with retry logic
 */
export const convertSpeechToText = async (audioBuffer, retries = 2) => {
  try {
    if (!openai) {
      console.warn('OpenAI not configured, using fallback message');
      return "Voice recording received but speech-to-text is not configured. Please add your OpenAI API key to enable this feature, or type your answer manually.";
    }

    // Create a File object from buffer for OpenAI API
    const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    // Use OpenAI Whisper API for transcription with timeout
    const response = await Promise.race([
      openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
      )
    ]);
    
    return response;
    
  } catch (error) {
    console.error('Speech-to-text error:', error);
    
    // Retry on network errors
    if ((error.code === 'ECONNRESET' || error.message?.includes('timeout')) && retries > 0) {
      console.log(`Retrying speech-to-text... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return convertSpeechToText(audioBuffer, retries - 1);
    }
    
    // Provide helpful error message
    if (error.message?.includes('API key')) {
      return "OpenAI API key is invalid. Please configure a valid API key to use speech-to-text.";
    }
    
    if (error.code === 'ECONNRESET' || error.message?.includes('timeout')) {
      return "Network connection issue. Please check your internet connection and try again, or type your answer manually.";
    }
    
    return "Speech-to-text conversion failed. Please type your answer manually.";
  }
};

export default {
  generateNextQuestion,
  analyzeAnswerQuality,
  convertSpeechToText
};
