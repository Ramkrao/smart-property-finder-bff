import request from 'request'
import { getPrimary, getSecondary } from '../services/findschool.js'
import { logger } from '../logger.js'
import primarySchools from '../../config/primary_schools.json' assert {type: "json"};
import secondarySchools from '../../config/secondary_schools.json' assert {type: "json"};
import suburbs from '../../config/suburbs.json' assert {type: "json"};

// import listings from '../../test/rea.json' assert {type: "json"};

function getREAListings(payload) {
  console.log(payload)
  return new Promise((resolve, reject) => {
    // {"suburbs":["dummy","Clarkefield"],"minPrice":"0","maxPrice":"500000","propertyType":"unit"}
    var query = {
      channel: "buy",
      filters:{
        replaceProjectWithFirstChild: true,
        propertyTypes: [payload.propertyType],
        priceRange: {minimum: payload.minPrice, maximum: payload.maxPrice},
        surroundingSuburbs: false
      },
      localities: constructLocalities(payload.suburbs),
      pageSize: "20"
    };

    var strQuery = JSON.stringify(query);
    logger.info(`Fetching from https://services.realestate.com.au/services/listings/search?query=${strQuery}`)
    request.get("https://services.realestate.com.au/services/listings/search?query=" + strQuery, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(parseListings(JSON.parse(body)));
      } else {
        reject(error);
      }
    });
    // resolve(parseListings(listings))

  });
}

function constructLocalities(arr) {
  console.log(arr)
  let localities = []
  arr.forEach(sub => {
    let code = suburbs.filter(el => el.name === sub)
    if (code.length > 0) {
      let locality = {
        locality: sub,
        subdivision: "VIC",
        postcode: code[0].postcode
      }
      localities.push(locality)
    }
  })
  return localities
}

async function parseListings(listings) {
  logger.info(`Parsing a list of ${listings.totalResultsCount} properties`)
  let filteredListings = []
  // first check if it's tiered
  if (listings.tieredResults) {
    for (const tier of listings.tieredResults) {
      // now iterate through individual results
      for (const listing of tier.results) {
        let property = {
          title: listing.title,
          description: listing.description,
          url: listing._links.prettyUrl.href,
          type: listing.propertyType,
          mainImage: `${listing.mainImage.server}/800x600-format=webp${listing.mainImage.uri}`,
          features: {
            "bedrooms": listing.features.general.bedrooms,
            "bathrooms": listing.features.general.bathrooms,
            "parkingSpaces": listing.features.general.parkingSpaces
          }
        }
        if (listing.landSize && listing.landSize.value && listing.landSize.unit) {
          property["landsize"] = listing.landSize.value + listing.landSize.unit
        }
        if (listing.price && listing.price.display) {
          property["price"] = listing.price.display
        }
        if (listing.advertising && listing.advertising.priceRange) {
          property["priceRange"] = listing.advertising.priceRange
        }
        
        if (listing.address && listing.address.showAddress === true) {
          property["address"] = `${listing.address.streetAddress}, ${listing.address.locality}, ${listing.address.postcode}`
          property["x"] = listing.address.location.longitude
          property["y"] = listing.address.location.latitude

          if (listing.address.location.longitude && listing.address.location.latitude ) {
            // get primary school
            let primary = await getPrimary(property.x, property.y)
            property["primarySchool"] = primary
            // lookup primary school in the BestEducation listings
            let beListing = primarySchools.filter(school => school.HyperLinkSchool.startsWith(primary.school))
            if (beListing.length > 0) {
              property["primarySchool"]["HyperLinkPostcode"] = beListing[0].HyperLinkPostcode
              property["primarySchool"]["HyperLinkOverall"] = beListing[0].HyperLinkOverall
              property["primarySchool"]["LabelPercentile"] = beListing[0].LabelPercentile
              property["primarySchool"]["TotalEnrolments"] = beListing[0].TotalEnrolments
              property["primarySchool"]["Sector"] = beListing[0].Sector
              property["primarySchool"]["ICSEA"] = beListing[0].ICSEA
            }
            // get secondary school
            let secondary = await getSecondary(property.x, property.y)
            property["secondarySchool"] = secondary
            // lookup primary school in the BestEducation listings
            let beSecListing = secondarySchools.filter(school =>  school.HyperLinkSchool.startsWith(secondary.school))
            if (beSecListing.length > 0) {
              property["secondarySchool"]["HyperLinkPostcode"] = beSecListing[0].HyperLinkPostcode
              property["secondarySchool"]["HyperLinkOverall"] = beSecListing[0].HyperLinkOverall
              property["secondarySchool"]["LabelPercentile"] = beSecListing[0].LabelPercentile
              property["secondarySchool"]["TotalEnrolments"] = beSecListing[0].TotalEnrolments
              property["secondarySchool"]["Sector"] = beSecListing[0].Sector
              property["secondarySchool"]["ICSEA"] = beSecListing[0].ICSEA
            }
          }

        }
        // check and get inspection/auction times
        if (listing.inspectionsAndAuctions) {
          let inspTimes = listing.inspectionsAndAuctions.filter(el => el.auction === false)
          if (inspTimes.length > 0) {
            property["inspectionTimes"] = inspTimes.map(i => ({"start": i.startTime, "end": i.endTime}))
          }

          let auction = listing.inspectionsAndAuctions.filter(el => el.auction === true)
          if (auction.length > 0) {
            property["auction"] = auction.startTime
          }
        }
        filteredListings.push(property)
      }
    }
  } else {
    logger.info("No Tiered listings found")
  }

  return filteredListings
}

export { getREAListings };
