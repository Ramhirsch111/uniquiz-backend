import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// --- Types ---
interface Question {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
}

enum GameState {
  WAITING = "WAITING",
  QUESTION_ACTIVE = "QUESTION_ACTIVE",
  QUESTION_RESULT = "QUESTION_RESULT",
  LEADERBOARD = "LEADERBOARD",
}

interface Player {
  id: string;
  name: string;
  score: number;
  hasAnswered: boolean;
  lastAnswerCorrect: boolean | null;
}

interface ServerState {
  gameState: GameState;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  players: Player[];
  totalAnswers: number;
}

// --- Questions Data ---
const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "מהו התפקיד העיקרי של רכיב ה-AI Agents בהקשר של Tools/Microservices?",
    options: [
      "לפרק משימות גדולות לשלבים קטנים ולבצע בקרה",
      "לנתח את בקשת המשתמש ולהחליט על אסטרטגיה",
      "לאפשר ל-LLM לבצע פעולות בעולם האמיתי (DB/API)",
      "לשמור תיעוד של כל הפעולות שבוצעו בעבר",
    ],
    correctIndex: 2,
  },
  {
    id: 2,
    text: "איזה סיכון ייחודי קיים במודל Two-Agent Loop?",
    options: [
      "Planner לא ישקיע מספיק מאמץ",
      "קשה לבצע אימות ביניים (Validation)",
      "התהליך יסתיים מוקדם מדי",
      "כניסה ל-Agreement Loop והסכמה על שגיאות",
    ],
    correctIndex: 3,
  },
  {
    id: 3,
    text: "מתי השימוש ב-Prompt Pipeline עדיף על פני פרומפט יחיד?",
    options: [
      "כאשר אורך הקונטקסט קטן מאוד",
      "כאשר רוצים תשובה יצירתית ללא מבנה",
      "כאשר המשימה חד-פעמית לסיעור מוחות",
      "כאשר המשימה דורשת פירוק לשלבים ועקביות",
    ],
    correctIndex: 3,
  },
  {
    id: 4,
    text: "מה ההבדל המהותי בין Prompt Injection לבין Jailbreaking?",
    options: [
      "Injection ע'י מפתחים, Jailbreak ע'י תוקפים",
      "Injection דורס הוראות; Jailbreak עוקף בטיחות",
      "אין הבדל מהותי, שני המונחים זהים",
      "Injection זה הזיות, Jailbreak זה עקיפת מסנן",
    ],
    correctIndex: 1,
  },
  {
    id: 5,
    text: "לסיכום מאמרים עם ציטוט מדויק, מדוע RAG עדיף על CoT?",
    options: [
      "כי CoT אינו מאפשר להסביר תהליך חשיבה",
      "RAG מחבר למקורות חיצוניים ומפחית הזיות",
      "כי CoT מגדיל עלות טוקנים משמעותית",
      "RAG פועל טוב יותר עם Zero-shot",
    ],
    correctIndex: 1,
  },
  {
    id: 6,
    text: "מהו החיסרון המרכזי של Few-shot prompting?",
    options: [
      "רגיש מאוד לניסוח המדויק",
      "בזבוז טוקנים וסיכון ל-Overfitting לדוגמאות",
      "התוצאות פחות עקביות",
      "דורש יותר זמן חישוב",
    ],
    correctIndex: 1,
  },
  {
    id: 7,
    text: "כיצד פרמטר Top-p עם ערך של 0.9 משפיע?",
    options: [
      "בוחר ממילים עם הסתברות מצטברת של 90%+",
      "בוחר תמיד את המילה ה-9 הכי סבירה",
      "מפחית הסתברות ב-10%",
      "בוחר אקראית מ-90% הפחות סבירות",
    ],
    correctIndex: 0,
  },
  {
    id: 8,
    text: "מדוע עדיף שסוכן LLM ישתמש במחשבון לחישובים?",
    options: [
      "כלי חיצוני תמיד מהיר יותר",
      "מחשבון שומר תוצאה לטווח ארוך",
      "LLM לא מבין מושגים מתמטיים",
      "LLM טועה בחישוב; מחשבון הוא דטרמיניסטי",
    ],
    correctIndex: 3,
  },
  {
    id: 9,
    text: "מדידת זמן (אמינות 93%). בוצעו 35 תצפיות. כמה נוספות נדרשות?",
    options: [
      "לא נדרשות תצפיות נוספות",
      "9 תצפיות נוספות",
      "44 תצפיות נוספות",
      "2 תצפיות נוספות",
    ],
    correctIndex: 1,
  },
  {
    id: 10,
    text: "אם מגדילים את מספר התצפיות (N), מה קורה לאי-הדיוק (r)?",
    options: [
      "לא ניתן לקבוע ללא ערך K",
      "רמת אי הדיוק תגדל",
      "רמת אי הדיוק לא תשתנה",
      "רמת אי הדיוק תקטן",
    ],
    correctIndex: 3,
  },
  {
    id: 11,
    text: "נתון: זמן חיצוני 2, פנימי 1, מכונה 5. מהם H ונצילות?",
    options: [
      "H=6, נצילות 83.3%",
      "H=8, נצילות 71.4%",
      "H=7, נצילות 42.8%",
      "H=7, נצילות 71.4%",
    ],
    correctIndex: 3,
  },
  {
    id: 12,
    text: "על פי מודל אשקרופט, מה מייצג הפרמטר An?",
    options: [
      "שעות מכונה המתקבלות משעת עובד המפעיל N",
      "המספר האופטימלי של מכונות לעובד",
      "העומס הממוצע על העובד",
      "התפוקה הצפויה לשעה ממערך N מכונות",
    ],
    correctIndex: 0,
  },
  {
    id: 13,
    text: "במודל איילון דטרמיניסטי: t=3, T=10. מה N מקסימלי?",
    options: ["3.25 מכונות", "4 מכונות", "2 מכונות", "3 מכונות"],
    correctIndex: 1,
  },
  {
    id: 14,
    text: "מה ההבדל בין 'p' כתוספת לבין 'p' באשקרופט?",
    options: [
      "בשני המקרים זה אותו דבר",
      "תוספת: קבוע לזמן; אשקרופט: יחס מחושב",
      "תוספת: פנימי בלבד; אשקרופט: הכל",
      "באשקרופט זה קבוע לזמן",
    ],
    correctIndex: 1,
  },
  {
    id: 15,
    text: "במודל אשקרופט, מהו 'זמן חפייה' (tMI)?",
    options: [
      "זמן המתנת מכונה לקבלת שירות מהעובד",
      "סך הזמן הפנימי והחיצוני",
      "הזמן שהעובד ממתין למכונה",
      "ההפרש בין זמן מחזור לזמן מכונה",
    ],
    correctIndex: 0,
  },
  {
    id: 16,
    text: "דגימה: 5 עובדים, 480 דק', 400 יח', אריזה 25%. מה זמן תקן?",
    options: ["1.8975 דקות", "1.65 דקות", "9.4875 דקות", "0.3795 דקות"],
    correctIndex: 1,
  },
  {
    id: 17,
    text: "נדרשו 5602 תצפיות (אמינות 95%, אי דיוק 4%). מהי P?",
    options: ["אין פרופורציה לבטלה", "אף תשובה אינה נכונה", "30%", "50%"],
    correctIndex: 2,
  },
  {
    id: 18,
    text: "מה אינו יתרון של שיטת דגימת העבודה?",
    options: [
      "מספקת מידע מפורט על תנועות הידיים",
      "מיומנות נמוכה נדרשת מהחוקר",
      "מאפשרת חקר על מספר תחנות במקביל",
      "אין צורך במחקר רציף",
    ],
    correctIndex: 0,
  },
  {
    id: 19,
    text: "נתונים: עובד 40, מכונה 120. מהו N אופטימלי לפי איילון?",
    options: [
      "N=3. המכונה יקרה, עדיף שהעובד ימתין",
      "N=4. ניצול מקסימלי של העובד",
      "N=3. עומס 100% ללא חפייה",
      "N=4. כי 3.66 קרוב ל-4",
    ],
    correctIndex: 0,
  },
  {
    id: 20,
    text: "יתרון מרכזי של דגימת עבודה לעומת חקר רציף?",
    options: [
      "מדויקת יותר בחישוב זמן תקן",
      "דורשת פחות תצפיות וחוסכת משאבים",
      "מודדת רק תהליכים אוטומטיים",
      "קובעת תקן לפי ציוד ולא עובדים",
    ],
    correctIndex: 1,
  },
  {
    id: 21,
    text: "אשקרופט: עומס נמוך מאוד והמון מכונות. למה ישאף An?",
    options: [
      "לא ניתן לדעת",
      "ירד בגלל תפוקה שולית פוחתת",
      "ישאף ל-1 (צוואר בקבוק)",
      "ישאף ל-N (כמעט אין הפרעות)",
    ],
    correctIndex: 3,
  },
];

// --- Game State ---
let gameState: GameState = GameState.WAITING;
let currentQuestionIndex = 0;
const players: Map<string, Player> = new Map();

// --- Helper Functions ---
function getPlayerList(): Player[] {
  return Array.from(players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    hasAnswered: p.hasAnswered,
    lastAnswerCorrect: p.lastAnswerCorrect,
  }));
}

function getCurrentQuestion(): Question | null {
  const currentQ = QUESTIONS[currentQuestionIndex];
  if (!currentQ) return null;

  return {
    id: currentQ.id,
    text: currentQ.text,
    options: currentQ.options,
    // Hide correctIndex during active question, reveal during results/leaderboard
    correctIndex:
      gameState === GameState.QUESTION_RESULT ||
      gameState === GameState.LEADERBOARD
        ? currentQ.correctIndex
        : -1,
  };
}

function getTotalAnswers(): number {
  return Array.from(players.values()).filter((p) => p.hasAnswered).length;
}

function broadcastState(): void {
  const stateUpdate: ServerState = {
    gameState,
    currentQuestionIndex,
    currentQuestion: getCurrentQuestion(),
    players: getPlayerList(),
    totalAnswers: getTotalAnswers(),
  };

  io.emit("state_update", stateUpdate);
}

function resetPlayers(): void {
  players.forEach((p) => {
    p.score = 0;
    p.hasAnswered = false;
    p.lastAnswerCorrect = null;
  });
}

function resetPlayersForQuestion(): void {
  players.forEach((p) => {
    p.hasAnswered = false;
    p.lastAnswerCorrect = null;
  });
}

function handleNextStep(): void {
  if (gameState === GameState.QUESTION_ACTIVE) {
    gameState = GameState.QUESTION_RESULT;
  } else if (gameState === GameState.QUESTION_RESULT) {
    if (currentQuestionIndex + 1 < QUESTIONS.length) {
      currentQuestionIndex++;
      gameState = GameState.QUESTION_ACTIVE;
      resetPlayersForQuestion();
    } else {
      gameState = GameState.LEADERBOARD;
    }
  } else if (gameState === GameState.LEADERBOARD) {
    gameState = GameState.WAITING;
    currentQuestionIndex = 0;
    resetPlayers();
  }
}

// --- Socket.IO Events ---
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current state to newly connected client
  const stateUpdate: ServerState = {
    gameState,
    currentQuestionIndex,
    currentQuestion: getCurrentQuestion(),
    players: getPlayerList(),
    totalAnswers: getTotalAnswers(),
  };
  socket.emit("state_update", stateUpdate);

  // Handle join event
  socket.on("join", (name: string) => {
    const playerName = typeof name === "string" ? name.slice(0, 15) : "Unknown";
    console.log(`Player joined: ${playerName} (${socket.id})`);

    players.set(socket.id, {
      id: socket.id,
      name: playerName,
      score: 0,
      hasAnswered: false,
      lastAnswerCorrect: null,
    });

    broadcastState();
  });

  // Handle start_game event
  socket.on("start_game", () => {
    console.log("Game started");
    gameState = GameState.QUESTION_ACTIVE;
    currentQuestionIndex = 0;
    resetPlayers();
    broadcastState();
  });

  // Handle submit_answer event
  socket.on("submit_answer", (answerIndex: number) => {
    const player = players.get(socket.id);

    if (
      player &&
      gameState === GameState.QUESTION_ACTIVE &&
      !player.hasAnswered
    ) {
      const currentQ = QUESTIONS[currentQuestionIndex];
      const isCorrect = answerIndex === currentQ.correctIndex;

      player.hasAnswered = true;
      player.lastAnswerCorrect = isCorrect;

      if (isCorrect) {
        player.score += 100;
      }

      console.log(
        `Player ${player.name} answered: ${isCorrect ? "correct" : "wrong"}`
      );
      broadcastState();
    }
  });

  // Handle admin_next event
  socket.on("admin_next", () => {
    console.log("Admin next step");
    handleNextStep();
    broadcastState();
  });

  // Handle request_state event
  socket.on("request_state", () => {
    const stateUpdate: ServerState = {
      gameState,
      currentQuestionIndex,
      currentQuestion: getCurrentQuestion(),
      players: getPlayerList(),
      totalAnswers: getTotalAnswers(),
    };
    socket.emit("state_update", stateUpdate);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    players.delete(socket.id);
    broadcastState();
  });
});

// --- Health Check Endpoint ---
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "UniQuiz Socket.IO Server",
    players: players.size,
    gameState,
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

// --- Start Server ---
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 UniQuiz Server running on port ${PORT}`);
});
