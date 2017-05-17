import * as async from 'async';
import * as redisConnect from './redisConnect';
import * as request from 'request';
import * as http from 'http';
import * as url from 'url';
// import * as mail from './mail';

export declare type Callback = (error?: Error, res?: any) => any;

const TEAMWORK_ACTIVITY_FLAG = process.env.TEAMWORK_ACTIVITY_FLAG;
const TEAMWORK_TIME_FLAG = process.env.TEAMWORK_TIME_FLAG;
const TEAMWORK_PROJECT_ID = process.env.TEAMWORK_PROJECT_ID;
const TEAMWORK_EMPLOYEE_ID = process.env.TEAMWORK_EMPLOYEE_ID;
const TEAMWORK_API_KEY = process.env.TEAMWORK_API_KEY;
const TEAMWORK_SUBDOMAIN = process.env.TEAMWORK_SUBDOMAIN;
const ENTRY_DESCRIPTION = process.env.ENTRY_DESCRIPTION;
const ENTRY_TAGS = process.env.TAGS;
const ENTRY_IS_BILLABLE = process.env.IS_BILLABLE;

export function markTime(event: any, context: any, callback: Callback) {
    redisConnect.instance().then(client => {
        console.log('connected to redis');

        client.get(TEAMWORK_ACTIVITY_FLAG, (error: Error, value: any) => {
            value === 'true'
                ? endSession()
                : startSession();
        });

        function startSession() {
            console.log('starting a new session');
            const activityValue = 'true';
            const absoluteTimeValue = getNowInUTCDate().toString();
            async.parallel([
                (callback: (error: Error, data: any) => void) => { client.set(TEAMWORK_ACTIVITY_FLAG, activityValue, (error: Error, data: any) => { callback(error, data); }); },
                (callback: (error: Error, data: any) => void) => { client.set(TEAMWORK_TIME_FLAG, absoluteTimeValue, (error: Error, data: any) => { callback(error, data); }); },
            ], (error: Error, results: any[]) => {
                if (error) {
                    throw new Error(`Error setting Redis flags: ${JSON.stringify(error)}`);
                }
                console.log('session started');
            });
        }

        function endSession() {
            console.log('logging current session');
            client.get(TEAMWORK_TIME_FLAG, (error: Error, timestampstring: string) => {
                if (error) { throw new Error(`Encountered an error reading time flag: ${JSON.stringify(error)}`); }
                if (!timestampstring) { throw new Error(`Expected to log current time but ${TEAMWORK_TIME_FLAG} was not found`); }
                const formerTimestamp = new Date(timestampstring);
                const currentTimestamp = getNowInUTCDate();
                const timeDiff = dateDiff(currentTimestamp, formerTimestamp);
                const compactStartDate = getCompactDate(formerTimestamp);
                const compactStartTime = getCompactTime(formerTimestamp);
                const base64 = new Buffer(`${TEAMWORK_API_KEY}:xxx`).toString('base64');
                const path = `/projects/${TEAMWORK_PROJECT_ID}/time_entries.json`;
                const options: request.OptionsWithUrl = {
                    url: url.resolve(`https://${TEAMWORK_SUBDOMAIN}.teamwork.com`, path),
                    headers: {
                        Authorization: 'BASIC ' + base64,
                        'Content-Type': 'application/json'
                    },
                    json: {
                        'time-entry': {
                            description: ENTRY_DESCRIPTION,
                            'person-id': TEAMWORK_EMPLOYEE_ID,
                            date: compactStartDate,
                            time: compactStartTime,
                            hours: timeDiff.hours,
                            minutes: timeDiff.minutes,
                            isbillable: ENTRY_IS_BILLABLE,
                            tags: ENTRY_TAGS
                        }
                    }
                };

                console.log('posting to teamwork');
                request.post(options, (error: Error, response: http.IncomingMessage, data: any) => {
                    console.log(error ? error : `${response.statusCode}: ${response.statusMessage}`);
                    error
                        ? (() => { console.error(error); })() // sendEmail(error),
                        : (() => {
                            const activityValue = 'false';
                            const absoluteTimeValue = '';
                            async.parallel([
                                (callback: (error: Error, data: any) => void) => { client.set(TEAMWORK_ACTIVITY_FLAG, activityValue, (error: Error, data: any) => { callback(error, data); }); },
                                (callback: (error: Error, data: any) => void) => { client.set(TEAMWORK_TIME_FLAG, absoluteTimeValue, (error: Error, data: any) => { callback(error, data); }); },
                            ], (error: Error, results: any[]) => {
                                if (error) {
                                    throw new Error(`Error setting Redis flags: ${JSON.stringify(error)}`);
                                } else {
                                    console.log(data);
                                    console.log('session complete');
                                    // // create/get topic
                                    // createTopic('aws-iot-button-sns-topic', (err, topicArn) => {
                                    //     if (err) {
                                    //         return callback(err);
                                    //     }
                                    //     console.log(`Publishing to topic ${topicArn}`);
                                    //     // publish message
                                    //     const params = {
                                    //         Message: `${event.serialNumber} -- processed by Lambda\nBattery voltage: ${event.batteryVoltage}`,
                                    //         Subject: `Hello from your IoT Button ${event.serialNumber}: ${event.clickType}`,
                                    //         TopicArn: topicArn,
                                    //     };
                                    //     // result will go to function callback
                                    //     SNS.publish(params, callback);
                                    // });
                                }
                            });
                        })();
                });
            });
        }
    });
}

function getCompactDate(d: Date) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth(), 2)}${pad(d.getUTCDay(), 2)}`;
}
function getCompactTime(d: Date) {
    return `${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}`;
}

function pad(n: number, width: number, z = 0) { return (String(z).repeat(width) + String(n)).slice(String(n).length); }

export interface DateDiff {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    millisecondsTotal: number;
}

export function dateDiff(d1: Date, d2: Date): DateDiff {
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    const diffDaysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 23));
    const diffHoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60) % 24);
    const diffMinutesRemaining = Math.ceil(timeDiff / (1000 * 60) % 60);
    const diffSecondsRemaining = Math.ceil(timeDiff / (1000 * 3600) % 60);

    return {
        days: diffDaysRemaining,
        hours: parseInt(pad(diffHoursRemaining, 2, 0)),
        minutes: parseInt(pad(diffMinutesRemaining, 2, 0)),
        seconds: parseInt(pad(diffSecondsRemaining, 2, 0)),
        millisecondsTotal: timeDiff
    };
}

export function getNowInUTCDate() {
    const d = new Date(Date.now());
    const u = new Date(d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDay(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds());
    return u;
}