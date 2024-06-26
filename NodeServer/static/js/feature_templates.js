function geoFeatureCollection() {
    return {
        type: "geojson",
        data: {
            type: 'FeatureCollection',
            features: []
        }
    }
}

function geoFeature(data, shape = 'Polygon', point = 'point') {
    let data_coordinates = data;
    if (shape == 'Polygon'){
        data_coordinates = [data];
    }
    return {
        type: "Feature",
        geometry: {
            type: shape,
            coordinates: data_coordinates
        }
    }
}

// Returns the geojson feature template.
function getGeoFeatureTemplate() {
    let feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [
                0.0,
                0.0
            ]
        },
        "properties": {
            "First_Name": "",
            "Last_Name": "",
            "Full_Name": "",
            "Street_Address": "",
            "City": "",
            "State": "",
            "Zip": "",
            "Age": "",
            "DOB": "",
            "Status": "",
            "Receives_Care": "No",
            "Care_Giver_1": "",
            "Care_Giver_2": "",
            "Care_Giver_3": "",
            "Care_Giver_4": "",
            "Mobile": "",
            "Email": "",
            "Miles_to_Church": "",
            "Time_to_Church": "",
            'marker_icon': ""
        }
    };
    return feature;
}