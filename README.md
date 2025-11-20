# TTECH Digital Senior Developer Project (CDK TypeScript project)

To deploy this project into you AWS account, do the following:

* cdk bootstrap <your account Id>/<Region> // Only once per account.
* npm install  //To install all needed packages
* cdk deploy

## Notes

* esbuild package is used to avoid installing Docker for building the stack.