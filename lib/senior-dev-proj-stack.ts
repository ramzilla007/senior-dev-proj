import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnIntegrationAssociation } from 'aws-cdk-lib/aws-connect';
import { join } from 'path';

export class SeniorDevProjStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table
    const table = new Table(this, 'VanityNumberTable', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      tableName: 'VanityNumberTable',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Lambda function
    const lambdaFunction = new NodejsFunction(this, 'LambdaFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: join(__dirname, '../Services/handler.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    // Give Lambda permission to write to table
    table.grantWriteData(lambdaFunction);
  }
}
