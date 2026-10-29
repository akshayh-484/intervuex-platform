/**
 * Question Generator Service
 * Generates 10 AI-powered interview questions from resume data.
 * Supports 3 difficulty levels: easy | medium | hard
 * Falls back to curated default questions if OpenAI is unavailable.
 */

import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Generate interview questions based on resume data and difficulty level.
 * @param {object} resumeData  — parsed resume (skills, experience, projects …)
 * @param {string[]|string} skills — candidate skills array or JSON string
 * @param {'easy'|'medium'|'hard'} difficulty — default 'medium'
 */
export const generateQuestions = async (resumeData, skills, difficulty = 'medium') => {
  const skillsList = normaliseSkills(skills);

  if (!openai) {
    console.warn('[questionGenerator] OpenAI not configured — using fallback questions');
    return getDefaultQuestions(difficulty);
  }

  try {
    const difficultyGuide = {
      easy:   'foundational concepts, basic definitions, simple scenarios suitable for entry-level candidates',
      medium: 'intermediate concepts, design trade-offs, moderate problem-solving suitable for mid-level candidates',
      hard:   'advanced architecture, edge-cases, system design, optimisation, suitable for senior-level candidates',
    }[difficulty] || 'intermediate';

    const prompt = `You are a senior technical interviewer at a Fortune-500 company.
Generate exactly 10 interview questions for a candidate with the following profile.

Difficulty: ${difficulty.toUpperCase()} — ${difficultyGuide}
Skills: ${skillsList.length ? skillsList.join(', ') : 'General software engineering'}
Experience: ${resumeData?.experience || 'Not specified'}
Education: ${resumeData?.education  || 'Not specified'}
Projects: ${resumeData?.projects    || 'Not specified'}

Question distribution:
  - 4 Technical questions (test depth of skill knowledge)
  - 2 Problem-solving / scenario questions (real-world situations)
  - 2 Resume-claim verification questions (probe claims from resume)
  - 2 Behavioural questions (teamwork, conflict, growth mindset)

Rules:
  - All questions must match the ${difficulty} difficulty level precisely
  - Questions must be specific to the candidate's skills, NOT generic
  - Each question must be unique and non-repetitive
  - Resume-claim questions must reference something from the profile above

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "id": "q1",
    "type": "technical",
    "difficulty": "${difficulty}",
    "question": "...",
    "expectedAnswer": "Brief model answer",
    "resumeClaim": "Optional — the specific resume claim being tested"
  }
]`;

    const res = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      messages:    [
        { role: 'system', content: 'You are an expert technical interviewer. Output only valid JSON. No markdown fences, no explanation.' },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.7,
      max_tokens:  2500,
    });

    const raw = res.choices[0].message.content.trim();
    // Strip markdown code fences if model adds them
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('AI response did not contain a JSON array');

    const questions = JSON.parse(match[0]);

    // Ensure difficulty tag is set on every question
    return questions.map((q, i) => ({
      id:            q.id || `q${i + 1}`,
      type:          q.type || 'technical',
      difficulty:    q.difficulty || difficulty,
      question:      q.question,
      expectedAnswer: q.expectedAnswer || '',
      resumeClaim:   q.resumeClaim || null,
    }));

  } catch (err) {
    console.error('[questionGenerator] AI generation failed:', err.message || err);
    return getDefaultQuestions(difficulty);
  }
};

/* ─── Helpers ─────────────────────────────────────────────── */

function normaliseSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills;
  try { return JSON.parse(skills); } catch { return []; }
}

function getDefaultQuestions(difficulty = 'medium') {
  const banks = {
    easy: [
      { id:'q1',  type:'technical',   question:'What is the difference between var, let, and const in JavaScript?',                          expectedAnswer:'var is function-scoped; let and const are block-scoped. const cannot be reassigned.' },
      { id:'q2',  type:'technical',   question:'Explain what an API is and give a real-world example.',                                      expectedAnswer:'An API is a contract that lets software talk to each other. E.g., a weather app calls a weather API.' },
      { id:'q3',  type:'technical',   question:'What is version control and why is it important?',                                           expectedAnswer:'Version control (e.g. Git) tracks code changes, enables collaboration and rollback.' },
      { id:'q4',  type:'technical',   question:'What is the difference between GET and POST HTTP methods?',                                  expectedAnswer:'GET retrieves data (no side effects); POST submits data and may change server state.' },
      { id:'q5',  type:'scenario',    question:'A user reports that a button on your website is not working. How do you investigate?',       expectedAnswer:'Check browser console for errors, reproduce the issue, inspect network calls, test cross-browser.' },
      { id:'q6',  type:'scenario',    question:'Describe a time you explained a technical concept to a non-technical person.',               expectedAnswer:'Use analogies, avoid jargon, check for understanding.' },
      { id:'q7',  type:'resume',      question:'Walk me through the most recent project on your resume.',                                    expectedAnswer:'Specific project description, role, technologies used, and outcome.' },
      { id:'q8',  type:'resume',      question:'Which skill on your resume are you most confident in and why?',                              expectedAnswer:'Deep understanding of chosen skill with practical examples.' },
      { id:'q9',  type:'behavioral',  question:'Describe a time you had to learn a new technology quickly.',                                  expectedAnswer:'Specific example showing self-learning, resourcefulness, and delivery.' },
      { id:'q10', type:'behavioral',  question:'How do you prioritise tasks when you have multiple deadlines at the same time?',              expectedAnswer:'Discusses urgency vs importance, communication with stakeholders.' },
    ],
    medium: [
      { id:'q1',  type:'technical',   question:'Explain the event loop in Node.js and how it handles concurrency.',                          expectedAnswer:'Single-threaded; uses non-blocking I/O via libuv. Callback queue processed after call stack empties.' },
      { id:'q2',  type:'technical',   question:'What is the difference between SQL and NoSQL databases? When would you choose each?',         expectedAnswer:'SQL: relational, ACID, structured. NoSQL: flexible schema, horizontal scaling. Choose based on data model and consistency needs.' },
      { id:'q3',  type:'technical',   question:'How does JWT authentication work? What are its security implications?',                       expectedAnswer:'Header.Payload.Signature; server verifies signature without a database round-trip. Risk: token theft if not stored securely.' },
      { id:'q4',  type:'technical',   question:'Explain the concept of database indexing and its trade-offs.',                               expectedAnswer:'Speeds up reads at the cost of slower writes and storage. B-tree indexes for range queries; hash for equality.' },
      { id:'q5',  type:'scenario',    question:'Your production API endpoint suddenly returns 500 errors. Walk through your debugging process.', expectedAnswer:'Check logs, reproduce locally, isolate the failing component, review recent deploys, roll back if needed.' },
      { id:'q6',  type:'scenario',    question:'You need to design a RESTful API for a library system. Outline the endpoints.',               expectedAnswer:'/books GET|POST, /books/:id GET|PUT|DELETE, /users, /loans etc. Discuss status codes and pagination.' },
      { id:'q7',  type:'resume',      question:'You listed React on your resume. Explain the virtual DOM and why it matters.',               expectedAnswer:'In-memory representation of the real DOM; diffs are computed then minimal real DOM changes applied.' },
      { id:'q8',  type:'resume',      question:'Describe a specific challenge you overcame in a project from your experience.',               expectedAnswer:'Specific challenge, approach, result, and lessons learned.' },
      { id:'q9',  type:'behavioral',  question:'Tell me about a time you disagreed with a team decision. What did you do?',                  expectedAnswer:'Raised concern professionally, presented data, accepted outcome, moved forward collaboratively.' },
      { id:'q10', type:'behavioral',  question:'How do you ensure code quality in a team environment?',                                       expectedAnswer:'Code reviews, automated testing, CI/CD, coding standards, pair programming.' },
    ],
    hard: [
      { id:'q1',  type:'technical',   question:'Design a distributed rate-limiter that handles 100,000 requests/second across 10 servers.',  expectedAnswer:'Token bucket or sliding window in Redis; Lua scripts for atomicity; consistent hashing for key distribution.' },
      { id:'q2',  type:'technical',   question:'Explain the CAP theorem with a concrete example of a system that prioritises AP over CP.',   expectedAnswer:'Cassandra is AP: during a partition it returns potentially stale data rather than refusing requests.' },
      { id:'q3',  type:'technical',   question:'How would you detect and prevent memory leaks in a long-running Node.js service?',           expectedAnswer:'Heap snapshots, profiling, --inspect flag, WeakRef/WeakMap for caches, proper cleanup of event listeners.' },
      { id:'q4',  type:'technical',   question:'Describe the two-phase commit protocol and its limitations in microservices.',               expectedAnswer:'Phase 1: prepare; Phase 2: commit. Limitation: blocking, coordinator SPOF. Alternatives: SAGA pattern.' },
      { id:'q5',  type:'scenario',    question:'You are asked to migrate a 10TB live PostgreSQL database to a new schema with zero downtime.', expectedAnswer:'Expand–contract pattern; dual-write; backfill; feature flags; shadow reads; gradual traffic migration.' },
      { id:'q6',  type:'scenario',    question:'Design the data model and API for a real-time collaborative document editor like Google Docs.', expectedAnswer:'OT or CRDTs for conflict resolution; WebSockets for real-time; document versioning; presence awareness.' },
      { id:'q7',  type:'resume',      question:'You claim experience with Kubernetes. Explain how horizontal pod autoscaling works and its limitations.', expectedAnswer:'HPA reads metrics from Metrics Server; scales replicas; lag in scaling down; cold-start costs.' },
      { id:'q8',  type:'resume',      question:'Pick the most complex system you built and describe its biggest architectural weakness.',     expectedAnswer:'Honest, specific critique showing depth and maturity in self-assessment.' },
      { id:'q9',  type:'behavioral',  question:'Describe a situation where you had to make a critical architectural decision under time pressure.', expectedAnswer:'Specific trade-offs made, stakeholder alignment, outcome, retrospective learning.' },
      { id:'q10', type:'behavioral',  question:'How do you mentor junior engineers while maintaining your own productivity?',                 expectedAnswer:'Pair programming, structured feedback, async code review, investing in documentation.' },
    ],
  };

  const pool = banks[difficulty] || banks.medium;
  return pool.map(q => ({ ...q, difficulty }));
}
