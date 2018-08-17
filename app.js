const _ = require('lodash');
const bunyan = require('bunyan');
const express = require('express');
const request = require('request-promise');

const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

const logger = bunyan.createLogger({
    name: 'book-api-v1',
    streams: [{
            stream: process.stdout,
            level: LOG_LEVEL
        },
    ],
});

const app = express();
const defaultRouter = express.Router();
const apiRouter = express.Router();

const PORT = 8080;
const PLACES_API_BASE_URI = 'http://maps.googleapis.com:443/maps/api/place';
const API_KEY = process.env.API_KEY;

const r = request.defaults({
    baseUrl: PLACES_API_BASE_URI
});

defaultRouter.get('/', (req, res) => {
    res.send('OK');
});

apiRouter.get('/museums', (req, res) => {
    const lat = req.query.lat;
    const lng = req.query.lng;
    r.get({
        uri: '/nearbysearch/json',
        qs: {
            key: API_KEY,
            location: lat + ',' + lng,
            rankby: 'distance',
            type: 'museum'
        },
        json: true
    }).then(body => {
        const result = JSON.stringify(_.map(body.results, item => {
            return {
                id: item.place_id,
                name: item.name
            };
        }), null, 4);
        logger.debug(`Sending response: ${result}`);
        res.send(result);
    }).catch(error => {
        logger.error(`Error: ${error}`);
        res.status(500).send();
    });
});

apiRouter.get('/museums/:museumId', (req, res) => {
    const museumId = req.params.museumId;
    r.get({
        uri: '/details/json',
        qs: {
            key: API_KEY,
            placeid: museumId
        },
        json: true
    }).then(body => {
        let result = {};
        result.id = body.result.place_id;
        result.name = body.result.name;
        result.location = body.result.geometry.location;
        result.address = body.result.formatted_address;
        result.website = body.result.website;
        result.url = body.result.url;
        result.photos = _.map(body.result.photos, item => {
            return {
                id: item.photo_reference,
                width: item.width,
                height: item.height
            };
        });
        logger.debug(`Sending response: ${result}`);
        res.send(result);
    }).catch(error => {
        logger.error(`Error: ${error}`);
        res.status(500).send();
    });
});

app.use('/', defaultRouter);
app.use('/nearby/v1', apiRouter);

app.listen(PORT, () => {
    logger.info(`Nearby API => Server listening on port ${PORT}!`)
});