// https://www.findmyschool.vic.gov.au/multi-lookup/2022/primary/145.122782031597,-37.80520898653437

import request from 'request'
import { logger } from '../logger.js'

function getPrimary(lat, lon) {
  logger.info(`Looking primary school for ${lat}, ${lon}`)
  return new Promise((resolve, reject) => {
    request.get(`https://www.findmyschool.vic.gov.au/multi-lookup/2023/primary/${lat},${lon}`, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(parseResults(JSON.parse(body)));
      } else {
        reject(error);
      }
    });
  });
}

function getSecondary(lat, lon) {
  logger.info(`Looking secondary school for ${lat}, ${lon}`)
  return new Promise((resolve, reject) => {
    request.get(`https://www.findmyschool.vic.gov.au/multi-lookup/2023/year7,juniorsec,singlesex/${lat},${lon}`, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(parseResults(JSON.parse(body)));
      } else {
        reject(error);
      }
    });
  });
}

function parseResults(json) {
  let block = {}
  if (json.results.length > 0) {
    block["school"] = json.results[0].School_Name
    block["yearLevel"] = json.results[0].Year_Level
    block["boundaryYear"] = json.results[0].Boundary_Year
    block["entity"] = json.results[0].Entity_Code
  }
  return block
}

export { getPrimary, getSecondary }
