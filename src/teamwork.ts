import * as async from 'async';
import * as redisConnect from './redisConnect';
import * as request from 'request';
import * as http from 'http';
import * as url from 'url';
import * as moment from 'moment-timezone';
// import * as mail from './mail';

const TEAMWORK_ACTIVITY_FLAG = process.env.TEAMWORK_ACTIVITY_FLAG;
const TEAMWORK_TIME_FLAG = process.env.TEAMWORK_TIME_FLAG;
const TEAMWORK_PROJECT_ID = process.env.TEAMWORK_PROJECT_ID;
const TEAMWORK_EMPLOYEE_ID = process.env.TEAMWORK_EMPLOYEE_ID;
const TEAMWORK_API_KEY = process.env.TEAMWORK_API_KEY;
const TEAMWORK_SUBDOMAIN = process.env.TEAMWORK_SUBDOMAIN;
const ENTRY_DESCRIPTION = process.env.ENTRY_DESCRIPTION;
const ENTRY_TAGS = process.env.ENTRY_TAGS;
const ENTRY_IS_BILLABLE = process.env.ENTRY_IS_BILLABLE;
const LAMBDA_LAST_SEEN_FLAG = process.env.LAMBDA_LAST_SEEN_FLAG;
const LAMBDA_ENTROPHY = process.env.LAMBDA_ENTROPHY;
// https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
const TIMEZONE = process.env.TIMEZONE;

export function markTime(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        redisConnect.instance().then(client => {
            console.log('marking time');
            // Main workflow
            Promise.resolve()
                .then(() => hasHadEnoughEntrophy())
                .then(() => resetLastSeen())
                .then(() => markTimeClick())
                .then(() => killClient())
                .then(() => {
                    console.log('teamwork complete');
                    resolve();
                })
                .catch(error => {
                    console.log('teamwork error');
                    killClient();
                    reject(error);
                });

            const killClient = () => redisConnect.terminate(client);

            // Check if function has been run recently
            const hasHadEnoughEntrophy = (): Promise<void> => {
                return new Promise<void>((resolve, reject) =>
                    client.get(LAMBDA_LAST_SEEN_FLAG, (error: Error, lastSeenString: string) => {

                        // In the case the lambda function has never been run, force last seen to Jan 1, 1970.
                        console.log(`${LAMBDA_LAST_SEEN_FLAG}:`, lastSeenString);
                        const lastSeen: moment.Moment = lastSeenString ? moment(lastSeenString) : moment('Jan 01 1970');

                        const entrophy = dateDiff(moment(), lastSeen);
                        console.log(`This function last seen at  ${lastSeen.format()}`);
                        console.log('currentDate', getUTCTimeString());
                        const diffInSeconds = entrophy.millisecondsTotal / 1000;
                        console.log(`This function was run ${diffInSeconds} seconds ago`);
                        diffInSeconds > LAMBDA_ENTROPHY
                            ? resolve()
                            : reject(new Error(`You must wait ${LAMBDA_ENTROPHY - diffInSeconds} seconds before issuing this function again.`));
                    })
                );
            };

            const resetLastSeen = (): Promise<void> => {
                return new Promise<void>((resolve, reject) => {
                    client.get(LAMBDA_LAST_SEEN_FLAG, (error: Error, lastSeenString: string) => {
                        const currentTimeStringUTC = getUTCTimeString();
                        console.log('resetting last seen to', currentTimeStringUTC);
                        client.set(LAMBDA_LAST_SEEN_FLAG, currentTimeStringUTC, (error: Error, data: any) => error ? reject() : resolve());
                    });
                });
            };

            // Either log time or start a new session,
            const markTimeClick = (): Promise<void> => {
                return new Promise<void>((resolve, reject) => {
                    client.exists(TEAMWORK_ACTIVITY_FLAG, (error: Error, value: any) => {
                        if (error) reject(new Error(`Encountered an error reading activity flag: ${JSON.stringify(error)}`));
                        else {
                            value
                                ? resolve(endSession())
                                : resolve(startSession());
                        }
                    });
                });
            };

            function startSession(): Promise<any> {
                return new Promise<any>((resolve, reject) => {
                    console.log('starting a new session');
                    const activityFlag = 'true';
                    const localTime = getUTCTimeString();
                    async.parallel([
                        (cb: (error: Error, data: any) => void) => client.set(TEAMWORK_ACTIVITY_FLAG, activityFlag, (error: Error, data: any) => cb(error, data)),
                        (cb: (error: Error, data: any) => void) => client.set(TEAMWORK_TIME_FLAG, localTime, (error: Error, data: any) => cb(error, data)),
                    ], (error: Error, results: any[]) => {
                        if (error) reject(new Error(`Error setting Redis flags: ${JSON.stringify(error)}`));
                        else resolve('starting new session');
                    });
                });
            }

            function endSession(): Promise<any> {
                return new Promise<void>((resolve, reject) => {
                    console.log('logging current session');

                    // Get session start time
                    client.get(TEAMWORK_TIME_FLAG, (error: Error, timestampstring: string) => {

                        // Guard clauses
                        if (error) reject(new Error(`Encountered an error reading time flag: ${JSON.stringify(error)}`));
                        if (!timestampstring) reject(new Error(`Expected to log current time but ${TEAMWORK_TIME_FLAG} was not found`));

                        // Setup log session times
                        const formerTimestamp = moment.tz(moment(timestampstring), TIMEZONE);
                        const currentTimestamp = getLocalTime();
                        console.log('timestampstring', timestampstring);
                        console.log('formerTimestamp', formerTimestamp);
                        console.log('currentTimestamp', currentTimestamp);
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

                        // Post information to Teamwork
                        request.post(options, (error: Error, response: http.IncomingMessage, data: any) => {
                            console.log(error ? error : `${response.statusCode}: ${response.statusMessage}`);
                            error
                                ? reject(error)
                                : (() => {
                                    const activityValue = 'false';
                                    const absoluteTimeValue = '';
                                    async.parallel([
                                        (callback: (error: Error, data: any) => void) => client.del(TEAMWORK_ACTIVITY_FLAG, (error: Error, data: any) => callback(error, data)),
                                        (callback: (error: Error, data: any) => void) => client.del(TEAMWORK_TIME_FLAG, (error: Error, data: any) => callback(error, data)),
                                    ], (error: Error, results: any[]) => {
                                        if (error) reject(new Error(`Error setting Redis flags: ${JSON.stringify(error)}`));
                                        else {
                                            console.log('posting to teamwork');
                                            console.log(options.json);
                                            console.log(data);
                                            console.log('session complete');
                                            resolve(data);
                                        }
                                    });
                                })();
                        });
                    });
                });
            }
        });
    });
}

function getCompactDate(d: moment.Moment) {
    // Add month increment to accomodate Teamwork timekeeping norms.
    return `${d.year()}${pad(d.month() + 1, 2)}${pad(d.date(), 2)}`;
}
function getCompactTime(d: moment.Moment) {
    return `${pad(d.hour(), 2)}:${pad(d.minute(), 2)}`;
}

function pad(n: number, width: number, z = 0) { return (String(z).repeat(width) + String(n)).slice(String(n).length); }

export interface DateDiff {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    millisecondsTotal: number;
}

export function dateDiff(d1: moment.Moment, d2: moment.Moment): DateDiff {
    const diff = (unit: string, truncateWith?: number): number => {
        const val = Math.floor(Math.abs(d1.diff(d2, unit as any)));
        return truncateWith ? val % truncateWith : val;
    };
    const diffInMilliSeconds = diff('milliseconds');
    const diffDaysRemaining = Math.floor(diff('days'));
    const diffHoursRemaining = Math.floor(diff('hours', 24));
    const diffMinutesRemaining = Math.floor(diff('minutes', 60));
    const diffSecondsRemaining = Math.ceil(diff('seconds', 60));

    return {
        days: diffDaysRemaining,
        hours: parseInt(pad(diffHoursRemaining, 2, 0)),
        minutes: parseInt(pad(diffMinutesRemaining, 2, 0)),
        seconds: parseInt(pad(diffSecondsRemaining, 2, 0)),
        millisecondsTotal: diffInMilliSeconds
    };
}

const UTCFormat = 'YYYY-MM-DDTHH:mm:ss';
function getUTCTime() { return moment.utc(); }
function getLocalTime() { return moment.tz(TIMEZONE); }
function getUTCTimeString() { return moment.utc().format(UTCFormat); }
function getLocalTimeString() { return moment.utc().tz(TIMEZONE).format(UTCFormat); }
function fixMonth(date: moment.Moment): moment.Moment { return date.add(1, 'month'); }
