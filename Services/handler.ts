import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

export const handler = async () => {
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      id: { S: Date.now().toString() },
      message: { S: "Hello from Lambda!" }
    }
  };

  await client.send(new PutItemCommand(params));

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "Item written to DynamoDB" })
  };
};
