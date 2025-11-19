import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";

export class SeniorDevProjStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table keyed by phone number
    const table = new dynamodb.Table(this, "VanityTable", {
      partitionKey: { name: "phone", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda for vanity generation
    const vanityLambda = new lambdaNode.NodejsFunction(this, "VanityLambda", {
      entry: path.join(__dirname, "../lambda/vanity.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(vanityLambda);

    // Outputs
    new cdk.CfnOutput(this, "VanityTableName", { value: table.tableName });
    new cdk.CfnOutput(this, "VanityLambdaName", {
      value: vanityLambda.functionName,
    });
  }
}
