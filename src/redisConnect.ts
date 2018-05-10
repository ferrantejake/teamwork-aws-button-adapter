import * as async from 'async';
import * as redis from 'redis';

let _instance: redis.RedisClient;
let _subscribe: redis.RedisClient;

// load config from env vars
let redisConfig = {
    url: process.env.REDIS_URL,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
};

// if config unavailable, load from localconfig
if (!redisConfig.url) {
    try {
        const fs = require('fs');
        redisConfig = JSON.parse(fs.readFileSync('./localconfig.json', 'utf8')).redis;
    } catch (error) {
        console.log('No Redis connection information available');
    }
}

// initilizes the redis connection instances
// export function init(ready: () => any): void {
//     async.parallel([
//         (cb: () => void) => instance().then(() => cb()),
//         (cb: () => void) => subscribe().then(() => cb())
//     ], (err, results) => { ready(); }); // instances are ready here
// }

export function create(): Promise<redis.RedisClient> {
    return new Promise((resolve, reject) => {
        //  redis client
        // (<any> redis).debug_mode = true;
        const redisClient = redis.createClient(redisConfig.port, redisConfig.url, { password: redisConfig.password });
        redisClient.auth(redisConfig.password, (error: Error, result: string) => {
            redisClient.on('error', handleError);
            redisClient.on('ready', () => {
                console.log(`created new client`);
                resolve(redisClient);
            });

            if (result !== 'OK') {
                console.log('error creating redis client');
                console.log(error);
                // TODO: log error
                reject(error);
            } else {
                /* authenticated */
                console.log('redis connection established');
            }
        });
    });
}

function handleError(error: Error) {
    console.log(`error: ${error}`);
}

export function instance(): Promise<redis.RedisClient> {
    return new Promise<redis.RedisClient>((resolve, reject) => {
        console.log(`attempting to create new instance client`);
        return create().then(redisClient => {
            console.log(`new instance client`);
            _instance = redisClient;
            resolve(_instance);
        }).catch(Promise.reject);
    });
}

export function subscribe(): Promise<redis.RedisClient> {
    return new Promise<redis.RedisClient>((resolve, reject) => {
        console.log(`attempting to create new subscription client`);
        return create().then(redisClient => {
            _subscribe = redisClient;
            resolve(_subscribe);
        }).catch(Promise.reject);
    });
}

export function terminate(client: redis.RedisClient) {
    return new Promise<void>((resolve, reject) => {
        client.end(true);
        resolve();
    });
}