//https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=29+Mitta+St,+Box+Hill+North,+Melbourne,+Victoria,+3129,+AUS&magicKey=dHA9MCNsb2M9MzE4NTI0NDEjbG5nPTM0I2ZhPTE5MDA1NDQjaG49MjkjbGJzPTEwOTo1NTc4MTMyMg%3D%3D

import request from 'request'
import { logger } from '../logger.js'


function getGeocode(address) {
  logger.info(`Fetching geo for address ${address}`)
  return new Promise((resolve, reject) => {
    request.get(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${address.replaceAll(' ', '+')}`, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(getXnY(JSON.parse(body)));
      } else {
        reject(error);
      }
    });
  });
}

function getXnY(json) {
  let block = {}
  if (json.candidates.length > 0) {
    block["address"] = json.candidates[0].address
    block["x"] = json.candidates[0].location.x
    block["y"] = json.candidates[0].location.y
  }
  return block
}

export { getGeocode }
