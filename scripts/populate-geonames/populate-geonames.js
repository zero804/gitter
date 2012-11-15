#!/usr/bin/env node
var csv = require('csv-stream');
var persistenceService = require("../../server/services/persistence-service");

var fs = require('fs');

var total = 0;
var totalFinished = 0;
var ended = false;

var countries = {};
fs.createReadStream('data/countryInfo.txt').pipe(csv.createStream({
    delimiter : '\t', // default is ,
    columns : [
        'ISO',
        'ISO3',
        'ISO-Numeric',
        'fips',
        'Country',
        'Capital'
    ],
    escapeChar : '"', // default is an empty string
    enclosedChar : '"' // default is an empty string
})).on('data',function(data){
    if(data['ISO'].indexOf('#') !== 0) {
        countries[data['ISO']] = data['Country'];
    }
}).on('end', function() {

    var regions = {};
    fs.createReadStream('data/admin1CodesASCII.txt').pipe(csv.createStream({
        delimiter : '\t', // default is ,
        columns : [
            'code',
            'name'
        ],
        escapeChar : '"', // default is an empty string
        enclosedChar : '"' // default is an empty string
    })).on('data',function(data){
        regions[data.code] = data.name;
    }).on('end',function(){
        // All of these arguments are optional.
        var options = {
            delimiter : '\t', // default is ,
            endLine : '\n', // default is \n,
            columns : [
                'geonameid',
                'name',
                'asciiname',
                'alternatenames',
                'latitude',
                'longitude',
                'feature class',
                'feature code',
                'country code',
                'cc2',
                'admin1 code',
                'admin2 code',
                'admin3 code',
                'admin4 code',
                'population',
                'elevation',
                'dem',
                'timezone',
                'modification date'
            ], // by default read the first line and use values found as columns
            escapeChar : '"', // default is an empty string
            enclosedChar : '"' // default is an empty string
        };

        var csvStream = csv.createStream(options);

        fs.createReadStream('data/ZA.txt').pipe(csvStream)
        .on('data',function(data){
         if(data['feature class'] === 'P') {
                // outputs an object containing a set of key/value pair representing a line found in the csv file.
                var adminCode = data['admin1 code'];
                adminCode = adminCode ? adminCode : null;

                var countryCode = data['country code'];
                countryCode = countryCode ? countryCode : null;

                var regionName = regions[countryCode + "." + adminCode];
                regionName = regionName ? regionName : null;

                var countryName =  countries[countryCode];
                countryName = countryName ? countryName : null;

                var population = parseInt(data['population'], 10);
                population = population ? population : null;

                var populatedPlace = {
                    geonameid: data.geonameid,
                    name: data.name,
                    coordinate: {
                        lon: data.longitude,
                        lat: data.latitude
                    },
                    region: { code: adminCode, name: regionName },
                    country: { code: countryCode, name: countryName },
                    population: population,
                    timezone: data.timezone
                };

                total++;
                persistenceService.GeoPopulatedPlace.update(
                    { geonameid: populatedPlace.geonameid },
                    populatedPlace,
                    { upsert: true },
                    function(err, numberAffected) {
                        totalFinished++;
                        if(err) {
                            console.error(err);
                        } else {
                            console.log("Affected " + numberAffected + " rows (total " + totalFinished + "/" + total + ")");
                        }

                        if(ended && total == totalFinished) {
                            process.exit();
                        }
                    });
            }
        })
        .on('end',function(data){
            console.log("Finished");
            ended = true;

            if(total == totalFinished) {
                process.exit();
            }
        });
    });


});

