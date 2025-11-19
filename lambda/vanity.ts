import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({});

// Basic letter mapping for phone keypad
const DIGIT_MAP: Record<string, string[]> = {
  "2": ["A", "B", "C"],
  "3": ["D", "E", "F"],
  "4": ["G", "H", "I"],
  "5": ["J", "K", "L"],
  "6": ["M", "N", "O"],
  "7": ["P", "Q", "R", "S"],
  "8": ["T", "U", "V"],
  "9": ["W", "X", "Y", "Z"],
};

// Small dictionary for scoring real words
const DICTIONARY = [
  "CALL",
  "NOW",
  "FREE",
  "HELP",
  "HOME",
  "FOOD",
  "PIZZA",
  "TAXI",
  "CAR",
  "DOG",
  "CAT",
  "TECH",
  "CODE",
  "DESK",
  "BEST",
  "FAST",
  "SAVE",
  "YOU",
  "ME",
  "GO",
  "SHOP",
  "BUY",
  "FUN",
  "PLAY",
  "WORK",
  "LOVE",
  "HAPPY",
  "DAY",
  "NIGHT",
  "SUN",
  "MOON",
  "STAR",
];

// Generate a single vanity candidate for one digit string
function randomVanityFromDigits(num: string): string {
  return num
    .split("")
    .map((d) =>
      DIGIT_MAP[d]
        ? DIGIT_MAP[d][Math.floor(Math.random() * DIGIT_MAP[d].length)]
        : d
    )
    .join("");
}

// Score candidate based on multiple readability/memorability factors
function scoreVanity(vanity: string): number {
  let score = 0;

  // 1) Word-based scoring (dictionary)
  for (const word of DICTIONARY) {
    if (vanity.includes(word)) score += word.length * 20; // strong weight
  }

  // 2) Penalize repeating letters
  let repeatPenalty = 0;
  for (let i = 0; i < vanity.length - 2; i++) {
    if (vanity[i] === vanity[i + 1] && vanity[i] === vanity[i + 2]) {
      repeatPenalty -= 25;
    }
  }
  score += repeatPenalty;

  // 3) Memorability: count vowel presence (A,E,I,O,U)
  const vowels = vanity.split("").filter((ch) => "AEIOU".includes(ch)).length;
  score += vowels * 3;

  // 4) Readability: avoid awkward rare letters (Q, X, Z)
  const awkward = vanity
    .split("")
    .filter((ch) => ["Q", "X", "Z"].includes(ch)).length;
  score -= awkward * 5;

  return score;
}

exports.handler = async (event: any) => {
  const original =
    event.Details?.ContactData?.CustomerEndpoint?.Address || event.phone || "";

  const digits = original.replace(/\D/g, "");

  if (!digits) {
    return {
      lambdaResult: "ERROR_NO_NUMBER",
    };
  }

  // Generate EXACT-LENGTH vanity numbers
  const candidates: string[] = [];
  for (let i = 0; i < 200; i++) {
    const v = randomVanityFromDigits(digits);
    if (v.length === digits.length) candidates.push(v);
  }

  // Score and sort
  const ranked = candidates
    .map((v) => ({ vanity: v, score: scoreVanity(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Top 3 for Connect to speak back
  const speak1 = ranked[0]?.vanity ?? "";
  const speak2 = ranked[1]?.vanity ?? "";
  const speak3 = ranked[2]?.vanity ?? "";

  // Store in DynamoDB
  await ddb.send(
    new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        phone: { S: digits },
        vanityNumbers: { SS: ranked.map((r) => r.vanity) },
        timestamp: { N: `${Date.now()}` },
      },
    })
  );

  // CONNECT-FRIENDLY RETURN
  return {
    lambdaResult: "OK",
    originalNumber: digits,
    top1: speak1,
    top2: speak2,
    top3: speak3,
  };
};
