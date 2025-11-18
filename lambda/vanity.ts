import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE_NAME = process.env.TABLE_NAME!;
const MAX_ITEMS = parseInt(process.env.MAX_ITEMS ?? "5", 10);

if (!TABLE_NAME) {
  throw new Error("Missing TABLE_NAME env var");
}

const dynamo = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(dynamo);

// Keypad mapping — pick first letter for each digit
const KEYPAD: Record<string, string[]> = {
  "2": ["A", "B", "C"],
  "3": ["D", "E", "F"],
  "4": ["G", "H", "I"],
  "5": ["J", "K", "L"],
  "6": ["M", "N", "O"],
  "7": ["P", "Q", "R", "S"],
  "8": ["T", "U", "V"],
  "9": ["W", "X", "Y", "Z"],
};

// Convert a phone string to digits-only then map digits -> letters (first letter)
function generateVanity(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");
  const chars: string[] = [];

  for (const ch of digitsOnly) {
    const letters = KEYPAD[ch];
    if (letters && letters.length > 0) {
      chars.push(letters[0]);
    } else {
      // keep digits (0,1)
      chars.push(ch);
    }
  }

  return chars.join("");
}

function extractPhoneFromConnectEvent(event: any): string | undefined {
  // Amazon Connect data structure for phone: Details.ContactData.CustomerEndpoint.Address
  if (event?.Details?.ContactData?.CustomerEndpoint?.Address) {
    return event.Details.ContactData.CustomerEndpoint.Address;
  }
  // For testing:
  if (event?.phone) return event.phone;
  if (event?.phoneNumber) return event.phoneNumber;
  return undefined;
}

export const handler = async (event: any) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const phone = extractPhoneFromConnectEvent(event);
  if (!phone) {
    return {
      statusCode: 400,
      body: {
        error: "No phone number provided in Connect event or 'phone' field.",
      },
    };
  }

  const vanity = generateVanity(phone);
  const now = Date.now();

  // Scan the table (small table; max 5 items) to determine number of distinct phones
  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: "phone, createdAt",
    })
  );

  const items = scanResult.Items ?? [];

  // Check if incoming phone exists
  const exists = items.some((it: any) => it.phone === phone);

  // If not exists AND we already have MAX_ITEMS entries -> delete oldest
  if (!exists && items.length >= MAX_ITEMS) {
    // Find the item with the smallest createdAt
    let oldest = items[0];
    for (const it of items) {
      if ((it.createdAt ?? 0) < (oldest.createdAt ?? 0)) {
        oldest = it;
      }
    }

    if (oldest && oldest.phone) {
      console.log("Deleting oldest item to make room:", oldest);
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { phone: oldest.phone },
        })
      );
    }
  }

  // 2) Put the new item
  const putItem = {
    phone,
    vanity,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: putItem,
    })
  );

  console.log("Put item:", putItem);

  return {
    statusCode: 200,
    body: { phone, vanity },
  };
};
