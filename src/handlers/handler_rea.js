import request from 'request'
import { getPrimary, getSecondary } from '../services/findschool.js'
import { logger } from '../logger.js'
import primarySchools from '../../config/primary_schools.json' assert {type: "json"};
import secondarySchools from '../../config/secondary_schools.json' assert {type: "json"};
import suburbs from '../../config/suburbs.json' assert {type: "json"};

function getREAListings(filters) {
  return new Promise((resolve, reject) => {
    // filters: {"suburbs":["dummy","Clarkefield"],"minPrice":"0","maxPrice":"500000","propertyType":"unit"}
    var query = {
      channel: "buy",
      filters:{
        replaceProjectWithFirstChild: true,
        propertyTypes: [filters.propertyType],
        priceRange: {minimum: filters.minPrice, maximum: filters.maxPrice},
        surroundingSuburbs: false
      },
      localities: constructLocalities(filters.suburbs),
      pageSize: "100"
    };

    var strQuery = JSON.stringify(query);
    logger.info(`Fetching from https://services.realestate.com.au/services/listings/search?query=${strQuery}`)
    request.get("https://services.realestate.com.au/services/listings/search?query=" + strQuery, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        resolve(parseListings(JSON.parse(body), filters));
      } else {
        reject(error);
      }
    });
  });
}

function constructLocalities(arr) {
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

async function parseListings(listings, filters) {
  logger.info(`Parsing a list of ${listings.totalResultsCount} properties`)
  let filteredListings = []
  // first check if it's tiered
  if (listings.tieredResults) {
    for (const tier of listings.tieredResults) {
      // now iterate through individual results
      for (const listing of tier.results) {
        logger.info(`Fetching info for the property - ${listing.address.streetAddress}, ${listing.address.locality}, ${listing.address.postcode}`)
        let lat = listing.address?.location?.latitude
        let long = listing.address?.location?.longitude

        // if there's an address then proceed
        if (lat && long) {
          // get primary school
          let primary = await getPrimary(lat, long)
          // lookup primary school in the BestEducation listings
          let beListing = primarySchools.filter(school => school.HyperLinkSchool.startsWith(primary.school))
          // get secondary school
          let secondary = await getSecondary(lat, long)
          // lookup primary school in the BestEducation listings
          let beSecListing = secondarySchools.filter(school =>  school.HyperLinkSchool.startsWith(secondary.school))

          let proceed = false
          // if filter only top primary schools and the property is in the top school zone then proceed
          if (filters.filterPrimary &&  filters.filterSecondary) {
            if (beListing.length > 0 && beSecListing.length > 0) {
              proceed = true
            }
          } else if ((filters.filterPrimary && beListing.length > 0) || (filters.filterSecondary && beSecListing.length > 0)) {
            proceed = true
          } else if (!filters.filterPrimary && !filters.filterSecondary) {
            proceed = true
          }
          logger.info(`Conditions met, proceeding to add the property ${proceed}`)
          // atleast one of the conditions have been met - so let's add the property
          if (proceed) {
            let property = {
              title: listing.title,
              description: listing.description,
              url: listing._links.prettyUrl.href,
              type: listing.propertyType,
              mainImage: `${listing.mainImage.server}/800x600-format=webp${listing.mainImage.uri}`,
              images: listing.images?.map(image => `${image.server}/800x600-format=webp${image.uri}`),
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

              property["primarySchool"] = primary
              if (beListing.length > 0) {
                property["primarySchool"]["HyperLinkPostcode"] = beListing[0].HyperLinkPostcode
                property["primarySchool"]["HyperLinkOverall"] = beListing[0].HyperLinkOverall
                property["primarySchool"]["LabelPercentile"] = beListing[0].LabelPercentile
                property["primarySchool"]["TotalEnrolments"] = beListing[0].TotalEnrolments
                property["primarySchool"]["Sector"] = beListing[0].Sector
                property["primarySchool"]["ICSEA"] = beListing[0].ICSEA
              }

              property["secondarySchool"] = secondary
              if (beSecListing.length > 0) {
                property["secondarySchool"]["HyperLinkPostcode"] = beSecListing[0].HyperLinkPostcode
                property["secondarySchool"]["HyperLinkOverall"] = beSecListing[0].HyperLinkOverall
                property["secondarySchool"]["LabelPercentile"] = beSecListing[0].LabelPercentile
                property["secondarySchool"]["TotalEnrolments"] = beSecListing[0].TotalEnrolments
                property["secondarySchool"]["Sector"] = beSecListing[0].Sector
                property["secondarySchool"]["ICSEA"] = beSecListing[0].ICSEA
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
      }
    }
  } else {
    logger.info("No Tiered listings found")
  }

  return filteredListings
}

export { getREAListings };
