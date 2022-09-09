import fs from 'fs';
import {parse} from 'himalaya'
import request from 'request'


const options = {
  url: "https://bettereducation.com.au/school/Primary/vic/vic_top_primary_schools.aspx",
  headers: {
    'Host': 'bettereducation.com.au',
    'User-Agent': 'PostmanRuntime/7.28.4'
  }
};

function callback(error, response, body) {
  console.error('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  // console.log('body:', body); // Print the HTML for the url.
  const json = parse(body)
  let schools = parsePrimarySchoolList(json);

  fs.writeFileSync('config/primary_schools.json', JSON.stringify(schools, null, 2)); // spacing level = 2);
}
 
request(options, callback);

const html = fs.readFileSync('test/secondary.html', {encoding: 'utf8'})
const json = parse(html);
let schools = parseSchoolList(json);
fs.writeFileSync('config/secondary_schools.json', JSON.stringify(schools, null, 2)); // spacing level = 2);

function parseSchoolList(json) {
  let schoolRows=json.filter(
    el => el.tagName === 'html')[0] //get the html
    .children.filter(el => el.tagName === 'body')[0] // get to the body
    .children.filter(el => el.tagName === 'form')[0] // get to the form
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'id' && att.value === 'main').length > 0)[0] // get the main panel
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'id' && att.value === 'content').length > 0)[0] // get the main content
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'class' && att.value === 'row').length > 0)[1]
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'class' && att.value === 'col-xs-12 col-sm-12 col-md-9').length > 0)[0]
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'id' && att.value === 'ctl00_ContentPlaceHolder1_UpdatePanel1').length > 0)[0]
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'style' && att.value === 'overflow-x: auto;').length > 0)[0]
    .children.filter(el => el.tagName === 'div')[0]
    .children.filter(el => el.tagName === 'table')[0]
    .children.filter(el => el.tagName === 'tbody')[0]
    .children.filter(el => el.tagName === 'tr');

  let schoolArr = [];
  for (const row of schoolRows) {
    let schoolObj = {};
    for (const tds of row.children.filter(el => el.tagName === 'td')){
      //for (const font of tds.children.filter(el => el.tagName === 'font')){
        for (const anc of tds.children.filter(el => el.tagName === 'a')){
          if (anc.children.filter(el => el.type === 'text').length > 0) {
            let key = anc.attributes.filter(el => el.key === 'id')[0].value;
            key = key.slice(key.lastIndexOf('_') + 1);
            schoolObj[key] = anc.children.filter(el => el.type === 'text')[0].content.replaceAll('\n', ' ').replaceAll('\t','');
          }
        }
        for (const anc of tds.children.filter(el => el.tagName !== 'a')){
          if (anc.tagName === 'span' && anc.children.length > 0){
            let key = anc.attributes[0].value;
            key = key.slice(key.lastIndexOf('_') + 1);
            schoolObj[key] = anc.children[0].content;
          } else if (anc.type === 'text' && !anc.content.startsWith('\n')){
            schoolObj['Sector'] = anc.content;
          }
        }
      //}
    }
    schoolArr.push(schoolObj);
  }
  return schoolArr;
}


function parsePrimarySchoolList(json) {
  let schoolRows=json.filter(
    el => el.tagName === 'html')[0] //get the html
    .children.filter(el => el.tagName === 'body')[0] // get to the body
    .children.filter(el => el.tagName === 'form')[0] // get to the form
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'id' && att.value === 'main').length > 0)[0] // get the main panel
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'id' && att.value === 'content').length > 0)[0] // get the main content
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'class' && att.value === 'row').length > 0)[1]
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'class' && att.value === 'col-xs-12 col-sm-12 col-md-9').length > 0)[0]
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'id' && att.value === 'ctl00_ContentPlaceHolder1_UpdatePanel1').length > 0)[0]
    .children.filter(el => el.tagName === 'div' && el.attributes.filter(att => att.key === 'style' && att.value === 'overflow-x: auto;').length > 0)[0]
    .children.filter(el => el.tagName === 'div')[0]
    .children.filter(el => el.tagName === 'table')[0]
    .children.filter(el => el.tagName === 'tbody')[0]
    .children.filter(el => el.tagName === 'tr');

  let schoolArr = [];
  for (const row of schoolRows) {
    let schoolObj = {};
    for (const tds of row.children.filter(el => el.tagName === 'td')){
      for (const font of tds.children.filter(el => el.tagName === 'font')){
        for (const anc of font.children.filter(el => el.tagName === 'a')){
          if (anc.children.filter(el => el.type === 'text').length > 0) {
            let key = anc.attributes.filter(el => el.key === 'id')[0].value;
            key = key.slice(key.lastIndexOf('_') + 1);
            schoolObj[key] = anc.children.filter(el => el.type === 'text')[0].content.replaceAll('\n', ' ').replaceAll('\t','');
          }
        }
        for (const anc of font.children.filter(el => el.tagName !== 'a')){
          if (anc.tagName === 'span' && anc.children.length > 0){
            let key = anc.attributes[0].value;
            key = key.slice(key.lastIndexOf('_') + 1);
            schoolObj[key] = anc.children[0].content;
          } else if (anc.type === 'text' && !anc.content.startsWith('\r\n')){
            schoolObj['Sector'] = anc.content;
          }
        }
      }
    }
    schoolArr.push(schoolObj);
  }
  return schoolArr;
}
