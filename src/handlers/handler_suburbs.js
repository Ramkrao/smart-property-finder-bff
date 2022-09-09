import request from 'request'
import { logger } from '../logger.js'
import suburbs from '../../config/suburbs.json' assert {type: "json"};

function fetchSuburbs() {
  return suburbs
}

// curl http://v0.postcodeapi.com.au/suburbs/\?name\=carlton\&state\=vic -H 'Accept: application/json; indent=4'
async function getSuburbs() {
  let suburbList = []
  for (const suburb of suburbs) {
    let s = await resolveSuburbs(suburb)
    if (s && s.name) {
      suburbList.push(s)
    }
  }
  return suburbList;
}

async function resolveSuburbs(suburb) {
  logger.info(`Fetching details for the suburb ${suburb.name}`)

  let options = {
    url: `http://v0.postcodeapi.com.au/suburbs/?name=${encodeURIComponent(suburb.name)}&state=vic`,
    headers: {
      'Accept': 'application/json'
    }
  };
  return new Promise((resolve, reject) => {
    request.get(options, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(parseResults(JSON.parse(body), suburb.name));
      } else {
        reject(error);
      }
    });
  });
}

function parseResults(json, suburb) {
  let block = {}
  let result = json.filter(el => el.name === suburb)
  if (result.length > 0) {
    block = {
      "name": result[0].name,
      "postcode": result[0].postcode,
      "state": result[0].state.abbreviation,
      "locality": result[0].locality,
      "latitude": result[0].latitude,
      "longitude": result[0].longitude
    }
  } else {
    console.error("Couldn't find entries for " + suburb)
  }
  return block
}

export { fetchSuburbs, getSuburbs };
