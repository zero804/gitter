#!/usr/bin/env node
var csv = require('csv-stream');

var fs = require('fs');

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
        }

        var csvStream = csv.createStream(options);

        fs.createReadStream('data/cities15000.txt').pipe(csvStream)
            .on('data',function(data){
               if(data['feature class'] === 'P') {
                // outputs an object containing a set of key/value pair representing a line found in the csv file.
                    console.log({
                        geonameid: data.geonameid,
                        name: data.name,
                        coordinate: {
                            lon: data.longitude,
                            lat: data.latitude
                        },
                        region: { code: data['admin1 code'], name: regions[data['country code'] + "." + data['admin1 code']] },
                        country: { code: data['country code'], name: countries[data['country code']] },
                        timezone: data.timezone

                    });
            }
            });
    });

     
});

