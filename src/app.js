import Hapi from 'hapi'
import { logger } from './logger.js'

/* swagger section */
// const Inert = require('inert');
// const Vision = require('vision');
// const HapiSwagger = require('hapi-swagger');
// const Pack = require('../../package');

import { getREAListings } from "./handlers/handler_rea.js";
import { fetchSuburbs } from "./handlers/handler_suburbs.js";

const init = async () => {
  
  const server = Hapi.Server({
    port: process.env.SERVER_PORT,
    routes: {
        cors: true
    }
  });

  server.route({
    method: 'GET',
    path: '/listings',
    config: {
      description: 'Get listings based on the search query',
      tags: ['api', 'v1', 'bff']
    },
    handler: async (request, h) => {
      logger.info(`GET /listings - Received request for processing with payload ${request.query.payload}`);
      const response = h.response(await getREAListings(JSON.parse(request.query.payload)));
      response.type('application/json');
      return response;
    }
  });

  server.route({
    method: 'GET',
    path: '/suburbs',
    config: {
      description: 'Get a list of Melbourne suburbs',
      tags: ['api', 'v1', 'bff']
    },
    handler: async (request, h) => {
      logger.info(`GET /Suburbs Received request for processing`);
      const response = h.response(fetchSuburbs());
      response.type('application/json');
      return response;
    }
  });

    // await app.register([
    //    Inert,
    //    Vision,
    //    {
    //        plugin: HapiSwagger,
    //        options: {
    //            info: {
    //                title: 'CSP API Catalogue BFF - API Documentation',
    //                version: Pack.version
    //            }
    //        }
    //    }
    // ]);

  await server.start();
  logger.info(`Server running at ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});


init();
