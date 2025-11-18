import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";

export class SeniorDevProjStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table, use original phone number as the partition key
    const table = new dynamodb.Table(this, "VanityTable", {
      partitionKey: { name: "phone", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda function
    const fn = new NodejsFunction(this, "VanityFunction", {
      entry: path.join(__dirname, "../lambda/vanity.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.seconds(10),
      environment: {
        TABLE_NAME: table.tableName,
        MAX_ITEMS: "5"
      },
    });

    // Grant the lambda read/write permissions on the table
    table.grantReadWriteData(fn);

    // Outputs
    new cdk.CfnOutput(this, "VanityTableName", { value: table.tableName });
    new cdk.CfnOutput(this, "VanityLambdaName", { value: fn.functionName });
  }
}
