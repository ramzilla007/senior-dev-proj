import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({});

// Letter mapping for phone keypad
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

// Dictionary for scoring real words
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

// Generate a single vanity number for one digit string
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

// Score vanity based on readability/memorability
function scoreVanity(vanity: string): number {
  let score = 0;

  // Word-based scoring (dictionary)
  for (const word of DICTIONARY) {
    if (vanity.includes(word)) score += word.length * 20; // strong weight
  }

  // Penalize repeating letters
  let repeatPenalty = 0;
  for (let i = 0; i < vanity.length - 2; i++) {
    if (vanity[i] === vanity[i + 1] && vanity[i] === vanity[i + 2]) {
      repeatPenalty -= 25;
    }
  }
  score += repeatPenalty;

  // Memorability: count vowel presence (A,E,I,O,U)
  const vowels = vanity.split("").filter((ch) => "AEIOU".includes(ch)).length;
  score += vowels * 3;

  // Readability: avoid awkward rare letters (Q, X, Z)
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

  // Generate vanity numbers
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
  const vanity1 = ranked[0]?.vanity ?? "";
  const vanity2 = ranked[1]?.vanity ?? "";
  const vanity3 = ranked[2]?.vanity ?? "";

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
    top1: vanity1,
    top2: vanity2,
    top3: vanity3,
  };
};
