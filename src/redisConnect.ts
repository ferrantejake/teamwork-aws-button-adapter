import * as async from 'async';
import * as redis from 'redis';
const debugSys = require('debug')('droplit-sys:redis');

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
        debugSys('No Redis connection information available');
    }
}

// initilizes the redis connection instances
export function init(ready: () => any): void {
    async.parallel([
        (cb: () => void) => instance().then(() => cb()),
        (cb: () => void) => subscribe().then(() => cb())
    ], (err, results) => { ready(); }); // instances are ready here
}

export function create(): Promise<redis.RedisClient> {
    return new Promise((resolve, reject) => {
        //  redis client
        // (<any> redis).debug_mode = true;
        const redisClient = redis.createClient(redisConfig.port, redisConfig.url, { password: redisConfig.password });
        redisClient.auth(redisConfig.password, (error: Error, result: string) => {
            redisClient.on('error', handleError);
            if (result === 'OK') {
                /* authenticated */
                debugSys(`created new client`);
                resolve(redisClient);
            } else {
                debugSys('error creating redis client');
                debugSys(error);
                // TODO: log error
                reject(error);
            }
        });
    });
}

function handleError(error: Error) {
    debugSys(`error: ${error}`);
}

export function instance(): Promise<redis.RedisClient> {
    debugSys(`attempting to create new instance client`);
    if (_instance) {
        debugSys(`instance client already exists`);
        return Promise.resolve(_instance);
    } else {
        return create().then(redisClient => {
            _instance = redisClient;
            return Promise.resolve(redisClient);
        }).catch(Promise.reject);
    }
}

export function subscribe(): Promise<redis.RedisClient> {
    debugSys(`attempting to create new subscription client`);
    if (_subscribe) {
        debugSys(`subscription client already exists`);
        return Promise.resolve(_subscribe);
    } else {
        return create().then(redisClient => {
            _subscribe = redisClient;
            return Promise.resolve(redisClient);
        }).catch(Promise.reject);
    }
}