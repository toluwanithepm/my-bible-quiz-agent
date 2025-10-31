// src/mastra/tools/bible-quiz-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface BibleQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  explanation?: string;
}

// In-memory cache for daily questions
const questionCache = new Map<string, { questions: BibleQuestion[]; timestamp: number }>();

// Sample Bible questions database
const questionBank: BibleQuestion[] = [
  {
    id: 1,
    question: "Who was the first king of Israel?",
    options: { A: "David", B: "Saul", C: "Solomon", D: "Samuel" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "Old Testament - Kings"
  },
  {
    id: 2,
    question: "How many days and nights did it rain during the Great Flood?",
    options: { A: "30", B: "40", C: "50", D: "100" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "Old Testament - Genesis"
  },
  {
    id: 3,
    question: "Who betrayed Jesus for 30 pieces of silver?",
    options: { A: "Peter", B: "John", C: "Judas Iscariot", D: "Thomas" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "New Testament - Gospels"
  },
  {
    id: 4,
    question: "What was the name of Moses' brother?",
    options: { A: "Aaron", B: "Joshua", C: "Caleb", D: "Eleazar" },
    correctAnswer: "A",
    difficulty: "easy",
    category: "Old Testament - Exodus"
  },
  {
    id: 5,
    question: "Which book of the Bible contains the Ten Commandments?",
    options: { A: "Genesis", B: "Leviticus", C: "Exodus", D: "Deuteronomy" },
    correctAnswer: "C",
    difficulty: "medium",
    category: "Old Testament - Law"
  },
  {
    id: 6,
    question: "Who wrote most of the New Testament epistles?",
    options: { A: "Peter", B: "Paul", C: "John", D: "James" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "New Testament - Epistles"
  },
  {
    id: 7,
    question: "What did God create on the third day?",
    options: { A: "Animals", B: "Humans", C: "Dry land and vegetation", D: "Sun and moon" },
    correctAnswer: "C",
    difficulty: "medium",
    category: "Old Testament - Creation"
  },
  {
    id: 8,
    question: "How many disciples did Jesus have?",
    options: { A: "10", B: "12", C: "14", D: "7" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "New Testament - Disciples"
  },
  {
    id: 9,
    question: "Who was swallowed by a great fish?",
    options: { A: "Jonah", B: "Job", C: "Jeremiah", D: "Joel" },
    correctAnswer: "A",
    difficulty: "easy",
    category: "Old Testament - Prophets"
  },
  {
    id: 10,
    question: "What is the shortest verse in the Bible?",
    options: { A: "Rejoice always", B: "Jesus wept", C: "God is love", D: "Pray continually" },
    correctAnswer: "B",
    difficulty: "medium",
    category: "Bible Trivia"
  },
  {
    id: 11,
    question: "Who built the ark?",
    options: { A: "Abraham", B: "Moses", C: "Noah", D: "Jacob" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "Old Testament - Genesis"
  },
  {
    id: 12,
    question: "What was Jesus' first miracle?",
    options: { A: "Healing the blind", B: "Walking on water", C: "Turning water into wine", D: "Feeding 5000" },
    correctAnswer: "C",
    difficulty: "medium",
    category: "New Testament - Miracles"
  },
  {
    id: 13,
    question: "Who defeated Goliath?",
    options: { A: "Saul", B: "David", C: "Jonathan", D: "Samuel" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "Old Testament - David"
  },
  {
    id: 14,
    question: "How many books are in the New Testament?",
    options: { A: "23", B: "25", C: "27", D: "29" },
    correctAnswer: "C",
    difficulty: "medium",
    category: "Bible Structure"
  },
  {
    id: 15,
    question: "Who led the Israelites out of Egypt?",
    options: { A: "Aaron", B: "Moses", C: "Joshua", D: "Abraham" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "Old Testament - Exodus"
  },
  {
    id: 16,
    question: "What did John the Baptist eat in the wilderness?",
    options: { A: "Fish and bread", B: "Locusts and wild honey", C: "Fruits and vegetables", D: "Manna" },
    correctAnswer: "B",
    difficulty: "medium",
    category: "New Testament - John the Baptist"
  },
  {
    id: 17,
    question: "Who was the mother of Jesus?",
    options: { A: "Elizabeth", B: "Martha", C: "Mary", D: "Rachel" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "New Testament - Jesus' Family"
  },
  {
    id: 18,
    question: "What was the name of the garden where Adam and Eve lived?",
    options: { A: "Gethsemane", B: "Eden", C: "Galilee", D: "Bethlehem" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "Old Testament - Creation"
  },
  {
    id: 19,
    question: "Who denied Jesus three times?",
    options: { A: "John", B: "James", C: "Peter", D: "Andrew" },
    correctAnswer: "C",
    difficulty: "medium",
    category: "New Testament - Passion"
  },
  {
    id: 20,
    question: "What is the last book of the Bible?",
    options: { A: "Jude", B: "3 John", C: "Revelation", D: "Acts" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "Bible Structure"
  },
  {
    id: 21,
    question: "Who was thrown into a lion's den?",
    options: { A: "Daniel", B: "David", C: "Elijah", D: "Ezekiel" },
    correctAnswer: "A",
    difficulty: "easy",
    category: "Old Testament - Prophets"
  },
  {
    id: 22,
    question: "What did Jacob give to Joseph that made his brothers jealous?",
    options: { A: "A coat of many colors", B: "Gold coins", C: "A staff", D: "Land" },
    correctAnswer: "A",
    difficulty: "medium",
    category: "Old Testament - Joseph"
  },
  {
    id: 23,
    question: "How many plagues did God send on Egypt?",
    options: { A: "7", B: "10", C: "12", D: "15" },
    correctAnswer: "B",
    difficulty: "medium",
    category: "Old Testament - Exodus"
  },
  {
    id: 24,
    question: "Who was the wisest king of Israel?",
    options: { A: "David", B: "Saul", C: "Solomon", D: "Hezekiah" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "Old Testament - Kings"
  },
  {
    id: 25,
    question: "What happened on the day of Pentecost?",
    options: { A: "Jesus ascended", B: "Holy Spirit came", C: "Jesus was born", D: "Temple was destroyed" },
    correctAnswer: "B",
    difficulty: "medium",
    category: "New Testament - Acts"
  },
  {
    id: 26,
    question: "Who baptized Jesus?",
    options: { A: "Peter", B: "Andrew", C: "John the Baptist", D: "James" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "New Testament - Jesus' Life"
  },
  {
    id: 27,
    question: "What was Paul's name before his conversion?",
    options: { A: "Simon", B: "Saul", C: "Stephen", D: "Samuel" },
    correctAnswer: "B",
    difficulty: "medium",
    category: "New Testament - Paul"
  },
  {
    id: 28,
    question: "How many sons did Jacob have?",
    options: { A: "10", B: "11", C: "12", D: "13" },
    correctAnswer: "C",
    difficulty: "medium",
    category: "Old Testament - Patriarchs"
  },
  {
    id: 29,
    question: "What was the name of Abraham's wife?",
    options: { A: "Rachel", B: "Sarah", C: "Rebecca", D: "Leah" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "Old Testament - Patriarchs"
  },
  {
    id: 30,
    question: "Who wrote the book of Revelation?",
    options: { A: "Paul", B: "Peter", C: "John", D: "James" },
    correctAnswer: "C",
    difficulty: "medium",
    category: "New Testament - Books"
  },
  {
    id: 31,
    question: "What did the dove bring back to Noah?",
    options: { A: "Fig leaf", B: "Olive branch", C: "Cedar branch", D: "Apple" },
    correctAnswer: "B",
    difficulty: "medium",
    category: "Old Testament - Flood"
  },
  {
    id: 32,
    question: "Where was Jesus born?",
    options: { A: "Nazareth", B: "Jerusalem", C: "Bethlehem", D: "Capernaum" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "New Testament - Nativity"
  },
  {
    id: 33,
    question: "Who was the oldest man in the Bible?",
    options: { A: "Adam", B: "Noah", C: "Methuselah", D: "Abraham" },
    correctAnswer: "C",
    difficulty: "hard",
    category: "Bible Trivia"
  },
  {
    id: 34,
    question: "What was Samson's source of strength?",
    options: { A: "His staff", B: "His hair", C: "His armor", D: "His sword" },
    correctAnswer: "B",
    difficulty: "medium",
    category: "Old Testament - Judges"
  },
  {
    id: 35,
    question: "Who was the tax collector that Jesus called to be a disciple?",
    options: { A: "Matthew", B: "Luke", C: "Mark", D: "Thomas" },
    correctAnswer: "A",
    difficulty: "medium",
    category: "New Testament - Disciples"
  },
  {
    id: 36,
    question: "What did God use to speak to Moses?",
    options: { A: "Thunder", B: "A burning bush", C: "An angel", D: "A dream" },
    correctAnswer: "B",
    difficulty: "easy",
    category: "Old Testament - Moses"
  },
  {
    id: 37,
    question: "How many days was Lazarus dead before Jesus raised him?",
    options: { A: "2", B: "3", C: "4", D: "5" },
    correctAnswer: "C",
    difficulty: "hard",
    category: "New Testament - Miracles"
  },
  {
    id: 38,
    question: "Who was Ruth's mother-in-law?",
    options: { A: "Naomi", B: "Rachel", C: "Deborah", D: "Sarah" },
    correctAnswer: "A",
    difficulty: "medium",
    category: "Old Testament - Ruth"
  },
  {
    id: 39,
    question: "What sea did Moses part?",
    options: { A: "Mediterranean Sea", B: "Dead Sea", C: "Red Sea", D: "Sea of Galilee" },
    correctAnswer: "C",
    difficulty: "easy",
    category: "Old Testament - Exodus"
  },
  {
    id: 40,
    question: "Who was the first martyr in the New Testament?",
    options: { A: "Peter", B: "Paul", C: "Stephen", D: "James" },
    correctAnswer: "C",
    difficulty: "hard",
    category: "New Testament - Early Church"
  }
];

function getRandomQuestions(count: number): BibleQuestion[] {
  const shuffled = [...questionBank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

export const bibleQuizTool = createTool({
  id: 'get-bible-quiz',
  description: 'Generate or retrieve daily Bible quiz questions',
  inputSchema: z.object({
    mode: z.enum(['daily', 'fresh']).describe('Mode: "daily" for cached daily quiz, "fresh" for new random quiz'),
    count: z.number().optional().default(20).describe('Number of questions to generate (default: 20)'),
  }),
  outputSchema: z.object({
    questions: z.array(z.object({
      id: z.number(),
      question: z.string(),
      options: z.object({
        A: z.string(),
        B: z.string(),
        C: z.string(),
        D: z.string(),
      }),
      correctAnswer: z.enum(['A', 'B', 'C', 'D']),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      category: z.string(),
    })),
    generatedAt: z.string(),
    mode: z.string(),
    totalQuestions: z.number(),
  }),
  execute: async ({ context }) => {
    const { mode, count } = context;
    const todayKey = getTodayKey();

    if (mode === 'daily') {
      // Check cache for today's questions
      const cached = questionCache.get(todayKey);
      const now = Date.now();
      
      // Cache is valid for 24 hours (86400000 ms)
      if (cached && (now - cached.timestamp) < 86400000) {
        return {
          questions: cached.questions,
          generatedAt: new Date(cached.timestamp).toISOString(),
          mode: 'daily (cached)',
          totalQuestions: cached.questions.length,
        };
      }

      // Generate new daily questions and cache them
      const newQuestions = getRandomQuestions(count);
      questionCache.set(todayKey, {
        questions: newQuestions,
        timestamp: now,
      });

      return {
        questions: newQuestions,
        generatedAt: new Date().toISOString(),
        mode: 'daily (fresh)',
        totalQuestions: newQuestions.length,
      };
    } else {
      // Fresh mode - always generate new questions
      const freshQuestions = getRandomQuestions(count);
      return {
        questions: freshQuestions,
        generatedAt: new Date().toISOString(),
        mode: 'fresh',
        totalQuestions: freshQuestions.length,
      };
    }
  },
});