/**
 * AI Evaluator Service
 * Uses OpenAI GPT-4 for answer evaluation
 */

import OpenAI from 'openai';

// Only initialize if API key is set
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Evaluate answer using AI
 */
export const evaluateWithAI = async (question, answer, expectedAnswer, options = {}) => {
  try {
    if (!openai) {
      return { score: 50, feedback: 'AI evaluation not configured' };
    }

    let prompt = '';

    if (options.evaluateApproach) {
      // Evaluate problem-solving approach
      prompt = `Evaluate the following answer for problem-solving approach, logic, and optimization.
      
Question: ${question}
Answer: ${answer}
${expectedAnswer ? `Expected Answer: ${expectedAnswer}` : ''}

Provide a score from 0-100 based on:
- Approach and methodology (40%)
- Logical reasoning (30%)
- Optimization and efficiency (30%)

Respond in JSON format: { "score": number, "feedback": "string" }`;
    } else if (options.checkResumeClaim) {
      // Check resume claim authenticity
      prompt = `Evaluate if the answer demonstrates genuine knowledge of the claimed skill/experience.
      
Question: ${question}
Answer: ${answer}
Resume Claim: ${options.resumeClaim}

Provide a score from 0-100 based on:
- Depth of knowledge (40%)
- Practical understanding (30%)
- Consistency with claim (30%)

Respond in JSON format: { "score": number, "feedback": "string" }`;
    } else {
      // Standard technical evaluation
      prompt = `Evaluate the technical accuracy of the following answer.
      
Question: ${question}
Answer: ${answer}
${expectedAnswer ? `Expected Answer: ${expectedAnswer}` : ''}

Provide a score from 0-100 based on:
- Technical accuracy (50%)
- Completeness (30%)
- Clarity (20%)

Respond in JSON format: { "score": number, "feedback": "string" }`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical interviewer evaluating candidate answers. Provide objective, fair assessments.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('AI evaluation error:', error);
    // Fallback to basic scoring if AI fails
    return { score: 50, feedback: 'AI evaluation unavailable' };
  }
};

/**
 * Generate AI summary of interview
 */
export const generateInterviewSummary = async (sessionId, scores, answers) => {
  try {
    if (!openai) {
      return 'Interview completed. AI summary not available — configure OpenAI API key to enable this feature.';
    }

    const prompt = `Generate a concise interview summary for a candidate.
    
Scores:
- Technical: ${scores.technical}/100
- Problem Solving: ${scores.problemSolving}/100
- Communication: ${scores.communication}/100
- Confidence: ${scores.confidence}/100
- Resume Authenticity: ${scores.resumeAuthenticity}/100
- Integrity Risk: ${scores.integrityRisk}/100
- Final Score: ${scores.final}/100

Number of answers: ${answers.length}

Provide a 3-4 sentence summary highlighting:
1. Overall performance
2. Key strengths
3. Areas for improvement
4. Recommendation

Keep it professional and objective.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert recruiter writing interview summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Generate summary error:', error);
    return 'Interview summary unavailable';
  }
};
