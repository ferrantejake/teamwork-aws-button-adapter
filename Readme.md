# Teamwork Timer Button Function

For AWS lambda Nodejs 4.3

# Publishing to AWS

First create your AWS Lambda function. More information can be found [here](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/steps-to-create-a-smart-home-skill#create-a-lambda-function).

1. Create a blank AWS Lambda function.
2. Select your function `Runtime` to `Nodejs 4.3`.
3. Add your `Role`. See [Create the execution role](http://docs.aws.amazon.com/lambda/latest/dg/with-s3-example-create-iam-role.html).
4. Upload this skill adapter using the instructions below.

Build project: `gulp build` transpiles the sources files in `src` to `lib`

Package project: `gulp package` compresses `index.js`, `lib` and `node_modules` into `bin/package.zip`

To upload this skill adapter to AWS Labmda,

1. Clone this repository to your local computer.
2. Install dependencies using `npm install` or `yarn`.
3. Run `gulp publish`. This will build the and package the project.
4. Upload `package.zip` to your AWS Lambda function. 
droplit
