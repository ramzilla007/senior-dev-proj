# TTECH Digital Senior Developer Project (CDK TypeScript project)

To deploy this project into you AWS account, do the following:

* cdk bootstrap {your account Id}/{Region} // Only once per account.
* npm install  //To install all needed packages
* cdk deploy

Deploy Connect Contact flow:
* In the AWS Connect console, create a new instance
* Go into the intance and click "Log in for emergency access"
* Under the "Routing" icon, click "Flows" then "Create Flow"
* Under the "Save" button dropdown, select "Import" and import this file: Connect/vanity-number-flow.json

To connect Lambda function to contact flow:
* Under your Connect instance in the AWS console, click on the "Flows" menu (right panel)
* Scroll down until you see "Lamnbda Functons"; find the lambda function imported by the CDK and add it
* Go into the contact flow created above, find the "Aws Lambda function" block.
* Click on that to edit and under the "Function ARN", click "Set manually" and select the lambda function added above.

## Notes

* esbuild package is used to avoid installing Docker for building the stack.