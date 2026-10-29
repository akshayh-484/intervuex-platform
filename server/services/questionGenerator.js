/**
 * Question Generator Service
 * AI-powered question generation based on resume
 */

import OpenAI from 'openai';

// Only initialize if API key is set
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Generate interview questions based on resume data
 */
export const generateQuestions = async (resumeData, skills) => {
  try {
    if (!openai) {
      console.warn('OpenAI not configured, using fallback questions');
      return getDefaultQuestions();
    }

    const skillsList = Array.isArray(skills) ? skills : 
                       (typeof skills === 'string' ? JSON.parse(skills) : []);

    const prompt = `You are an expert technical interviewer. Generate 10 interview questions based on the following candidate profile:

Skills: ${skillsList.join(', ') || 'General programming'}
Experience: ${resumeData?.experience || 'Not specified'}
Education: ${resumeData?.education || 'Not specified'}
Projects: ${resumeData?.projects || 'Not specified'}

Generate questions in the following categories:
- 3 Technical questions (specific to their skills)
- 3 Problem-solving/scenario questions
- 2 Resume claim verification questions
- 2 Behavioral questions

Return ONLY a JSON array with this exact structure:
[
  {
    "id": "q1",
    "type": "technical",
    "question": "Question text here",
    "expectedAnswer": "Brief expected answer",
    "resumeClaim": "Specific claim from resume being tested (if applicable)"
  }
]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert technical interviewer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse questions from AI response');
    }

    const questions = JSON.parse(jsonMatch[0]);

    return questions;
  } catch (error) {
    console.error('Question generation error:', error);
    
    // Fallback to default questions if AI fails
    return getDefaultQuestions();
  }
};

/**
 * Fallback default questions
 */
const getDefaultQuestions = () => {
  return [
    {
      id: 'q1',
      type: 'technical',
      question: 'Explain the difference between var, let, and const in JavaScript.',
      expectedAnswer: 'var is function-scoped, let and const are block-scoped. const cannot be reassigned.'
    },
    {
      id: 'q2',
      type: 'technical',
      question: 'What is the difference between SQL and NoSQL databases?',
      expectedAnswer: 'SQL databases are relational with fixed schemas, NoSQL are non-relational with flexible schemas.'
    },
    {
      id: 'q3',
      type: 'technical',
      question: 'Explain the concept of RESTful APIs.',
      expectedAnswer: 'REST uses HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations on resources.'
    },
    {
      id: 'q4',
      type: 'scenario',
      question: 'How would you optimize a slow database query?',
      expectedAnswer: 'Add indexes, optimize joins, use query caching, analyze execution plan.'
    },
    {
      id: 'q5',
      type: 'scenario',
      question: 'Describe how you would handle a production bug affecting users.',
      expectedAnswer: 'Assess impact, create hotfix, test thoroughly, deploy, monitor, post-mortem.'
    },
    {
      id: 'q6',
      type: 'scenario',
      question: 'How would you design a scalable system for 1 million users?',
      expectedAnswer: 'Load balancing, caching, database sharding, microservices, CDN.'
    },
    {
      id: 'q7',
      type: 'behavioral',
      question: 'Tell me about a challenging project you worked on.',
      expectedAnswer: 'Specific project with challenges, solutions, and outcomes.'
    },
    {
      id: 'q8',
      type: 'behavioral',
      question: 'How do you handle disagreements with team members?',
      expectedAnswer: 'Listen, understand perspectives, find common ground, focus on goals.'
    },
    {
      id: 'q9',
      type: 'resume',
      question: 'Walk me through your most recent project.',
      expectedAnswer: 'Detailed explanation of project, technologies, role, outcomes.',
      resumeClaim: 'Recent project experience'
    },
    {
      id: 'q10',
      type: 'resume',
      question: 'Explain a specific technology you mentioned in your resume.',
      expectedAnswer: 'Deep understanding of the technology and practical application.',
      resumeClaim: 'Technology expertise'
    }
  ];
};

/**
 * Generate follow-up question based on answer
 */
export const generateFollowUp = async (question, answer) => {
  try {
    const prompt = `Based on this interview question and answer, generate ONE relevant follow-up question:

Question: ${question}
Answer: ${answer}

Generate a follow-up that probes deeper into their understanding. Return ONLY the follow-up question text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert technical interviewer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Follow-up generation error:', error);
    return null;
  }
};
