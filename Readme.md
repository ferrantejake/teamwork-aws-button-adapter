# Droplit.io Smart Home Skill Adapter 

For AWS lambda Nodejs 4.3

## Device information mapping

https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference

## Utterance ##

Device "names" can be set in this order:

1. Using meta.friendlyName

2. Using meta.$label

3. by the device itself (product.friendlyName)

**If a device does not have any of these fields it will not be discovered by Alexa.**

## Device capabilities: Service Class Support ##

In order to manipulate a device with Alexa, the device must implement the supported services.

The droplit.io smart home skill adapter currently supports the following service classes:

* `BinarySwitch` for *On/Off Messages*
* `DimmableSwitch` for *Percentage Messages*

*Temperature Control Messages are not currently supported* 

For example, A device that implements BinarySwitch can have "turnOn" and "turnOff" requests made. 

### BinarySwitch

* turnOn -> `SET BinarySwitch.switch = "on";`
* turnOff -> `SET BinarySwitch.switch = "off";`

### DimmableSwitch

* setPercentage -> `SET DimmableSwitch.brightness = newPercentage;`
* incrementPercentage -> `CALL DimmableSwitch.stepUp(deltaPercentage);`
* decrementPercentage -> `CALL DimmableSwitch.stepDown(deltaPercentage);`

# Publishing to AWS

First create your AWS Lambda function. More information can be found [here](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/steps-to-create-a-smart-home-skill#create-a-lambda-function).

1. Create your AWS Lambda function using the `alexa-smart-home-skill-adapter` blueprint.
2. Add your skill `Application Id` to the function `Alexa Smart Home` trigger.
3. Select your function `Runtime` to `Nodejs 4.3`.
4. Add your `Role`. See [Create the execution role](http://docs.aws.amazon.com/lambda/latest/dg/with-s3-example-create-iam-role.html).
5. Upload this skill adapter using the instructions below.

Build project: `gulp build` transpiles the sources files in `src` to `lib`

Package project: `gulp package` compresses `index.js`, `lib` and `node_modules` into `bin/package.zip`

To upload this skill adapter to AWS Labmda,

1. Clone this repository to your local computer.
2. Install dependencies using `npm install` or `yarn`.
3. Run `gulp publish`. This will build the and package the project.
4. Upload `package.zip` to your AWS Lambda function. 
