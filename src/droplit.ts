import * as http from 'http';
import * as request from 'request';
import * as url from 'url';
import { Z_VERSION_ERROR } from 'zlib';

const { IOE_URL, DEVICEID, TOKEN } = process.env;

export function turnOn(): Promise<any> {
    return new Promise((resolve, reject) => {
        const uri = new url.URL(`/api/devices/${DEVICEID}/services/BinarySwitch.switch`, IOE_URL).toString();
        const options: request.OptionsWithUri = {
            uri,
            headers: { Authorization: TOKEN },
            json: { value: 'on' }
        };


        request.put(uri, options, (error: Error, response: http.IncomingMessage, body: any) => {
            console.log(`response [${response.statusCode}]\n`, error || body);
            if (error)
                return reject(error);
            return resolve(body);
        });
    });
}

export function turnOff(): Promise<any> {
    return new Promise((resolve, reject) => {
        const uri = new url.URL(`/api/devices/${DEVICEID}/services/BinarySwitch.switch`, IOE_URL).toString();
        const options: request.OptionsWithUri = {
            uri,
            headers: { Authorization: TOKEN },
            json: { value: 'off' }
        };


        request.put(options, (error: Error, response: http.IncomingMessage, body: any) => {
            console.log(`response [${response.statusCode}]\n`, error || body);
            if (error)
                return reject(error);
            return resolve(body);
        });
    });
}
