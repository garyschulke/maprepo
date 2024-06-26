
// Constants
const FIRSTNAME = 'first_name';
const LASTNAME = 'last_name';
const RECIEVESCARE = 'details.2112158181';
const CAREGIVER1 = 'details.2112158180';
const CAREGIVER2 = 'details.2112158182';
const CAREGIVER3 = 'details.2112158183';
const CAREGIVER4 = 'details.2112158184';
const CAREGIVERS = [CAREGIVER1, CAREGIVER2, CAREGIVER3, CAREGIVER4];
const EMAIL = 'details.87919705'
const EMAILADDRESS = 'address';
const LOCATION = 'details.1876809651'
const STREET = 'street_address';
const CITY = 'city';
const STATE = 'state';
const ZIP = 'zip';
const LONGITUDE = 'longitude';
const LATITUDE = 'latitude';
const STATUS = 'details.994712735.name';
const DOB = 'details.birthdate';
const PHONE = 'details.1162027446'
const PHONENUMBER = 'phone_number';
const INPUT = 'input';
const CHECKBOX = 'checkbox'
const LABEL = 'label'

mapboxgl.accessToken = API_KEY;

const filterGroup = document.getElementById('filter-group');


// Given some json and a string with json dot notation
// split the string and navigate to the value.
// This methodology for calculating found online.
function getValueAt(json_obj, path_string) {
    const keys = path_string.split('.');
    let target_value = json_obj;
    for (const key of keys) {
        if (target_value && target_value.hasOwnProperty(key)) {
            target_value = target_value[key];
        } else {
            return ""; // Property not found
        }
    }
    return target_value;
}

// Takes a date string in the YYYY-MM-DD format
// and caculates the age in full years.
function calculateAge(dob_string) {
    if (dob_string == '') {
        return "No DOB";
    }
    const dob_split = dob_string.split('-');
    const year = parseInt(dob_split[0]);
    const month = parseInt(dob_split[1]);
    const day = parseInt(dob_split[2]);

    const dob = new Date(year, month, day);     // make a Date object
    const diff_ms = Date.now() - dob.getTime(); // get difference in ms
    const age_dt = new Date(diff_ms);
    // Calculate the absolute value of the difference in years between 
    // the age Date object and the year 1970 (UNIX epoch)
    return Math.abs(age_dt.getUTCFullYear() - 1970);
}

// Looks for the string 'Yes'. 'Yes' or '' may be found.
// Then loop through CAREGIVERS finding names or ''
// element is a section of json data
function determineCareStatus(element) {
    let careArray = ['', '', '', '', ''];
    const status = getValueAt(element, RECIEVESCARE);
    if (status) {
        status.forEach(function (item) {
            if (item.name) {
                careArray[0] = item.name;
            }
        })
    }
    CAREGIVERS.forEach(
        function (item, index) {
            const giver = getValueAt(element, item);
            if (giver) {
                careArray[index + 1] = giver;
            }
        })
    // There are some corner cases where the data has a caregiver
    // but Recieves Care is blank ''. If so, Yes is assigned
    for (let index = 1; index < careArray.length; index++) {
        if (careArray[index]) {
            careArray[0] = 'Yes';
        }
    }

    return careArray;
}



// Returns the geojson header string.
// a feature_array may be passed in or omitted.
function getFeatureCollecton(feature_array = []) {
    return {
        "type": "FeatureCollection",
        "features": feature_array
    };
}

// Loop through the source data extracting the
// desired values and putting them into a geojson feature.
// It's a little ugly and sensitive to changes in the source data.
function createGeoJsonFrom(stdJson) {
    let memberGeoJson = getFeatureCollecton();
    stdJson.forEach(element => {
        try {
            const location = getValueAt(element, LOCATION);
            const id = getValueAt(element, 'id');
            // If there is no location, it can't be mapped.
            if (location == '') {
                // console.log(`${id} Missing location`);
                return;
            }

            let feature = getGeoFeatureTemplate();

            feature.geometry.coordinates[0] = location[0][LONGITUDE];
            feature.geometry.coordinates[1] = location[0][LATITUDE];

            const firstname = getValueAt(element, FIRSTNAME);
            const lastname = getValueAt(element, LASTNAME);

            let fp = feature.properties;
            fp.Miles_to_Church = 0;
            fp.First_Name = `${firstname}`;
            fp.Last_Name = `${lastname}`;
            fp.Full_Name = `${firstname} ${lastname}`;
            fp.Street_Address = location[0][STREET];
            fp.City = location[0][CITY];
            fp.State = location[0][STATE];
            fp.Zip = location[0][ZIP];
            const phone = getValueAt(element, PHONE);
            if (phone) {
                fp.Mobile = phone[0][PHONENUMBER];
            }
            const email = getValueAt(element, EMAIL);
            if (email) {
                fp.Email = email[0][EMAILADDRESS];
            }
            fp.Status = getValueAt(element, STATUS);
            const dob_string = getValueAt(element, DOB);
            fp.Age = calculateAge(dob_string);
            fp.DOB = dob_string;

            const carestatus = determineCareStatus(element);
            fp.Receives_Care = carestatus[0];
            fp.Care_Giver_1 = carestatus[1];
            fp.Care_Giver_2 = carestatus[2];
            fp.Care_Giver_3 = carestatus[3];
            fp.Care_Giver_4 = carestatus[4];

            memberGeoJson.features.push(feature);
        }
        catch (error) {
            console.log(getValueAt(element, "id") + ' caused error' + error);
            return;
        }

    });

    return memberGeoJson;
}

// Read in the source data from a json file.
// Shouldn't need it when the direct connection to Breeze is working.
async function fetchData() {

    let data = null;
    try {
        const response = await fetch('http://localhost:5500/api');
        data = await response.json();
        console.log(data);
    }
    catch (error) {
        console.log(error);
    }
    return (data);
}

// Function to get driving distance between two sets of coordinates
// Gets distances for the pop up.
async function fetchDrivingDistance(startCoordinates, endCoordinates) {
    const query = `${startCoordinates[0]},${startCoordinates[1]};${endCoordinates[0]},${endCoordinates[1]}`;
    const response = await fetch(`
    https://api.mapbox.com/directions/v5/mapbox/driving/${query}.json?access_token=${API_KEY}`);
    const data = await response.json();
    const distance = (data.routes[0].distance / 1609.344).toFixed(1); // Distance in meters
    const duration = (data.routes[0].duration / 60).toFixed(0); // Duration in seconds
    return [distance, duration];
}

//const BRZ_KEY = '176199653882149d82bdab0d8ece06a8';
const endpoint = 'https://covhsv.breezechms.com/api/people/?details=1';
//const SUBDOMAIN = 'covhsv';

// Returns JSON string of the "Active Members"
function extractActiveMembers(members) {
    active =
        members.features.filter(
            member => member.properties.Status == 'Active Member');
    return active;
}

// Returns a JSON string with member that are recieving care.
// "Recieves Care" has "Yes" assigned to it.
// Returns those recieving care, and everyone else
function extractCareRecievers(all_members) {
    let recievescare = getFeatureCollecton(
        all_members.filter(
            member => member.properties.Receives_Care == 'Yes'));
    let remaining_active =
        all_members.filter(
            member => member.properties.Receives_Care != 'Yes');
    return [recievescare, remaining_active];
}

// Filters out those who are 80+ years old
// and everyone else.
function extractEightyPlus(members) {
    let members_eightyplus = members.filter(
        member => member.properties.Age >= 80);
    let remaining_active = members.filter(
        member => member.properties.Age < 80 || member.properties.Age == 'No DOB');
    return [members_eightyplus, remaining_active];
}

// Children under 18 years old are filtered out wether they are 
// members or not.
function removeChildren(members) {
    let adults =
        members.filter(
            member => member.properties.Age >= 18);
    return adults;
}

// members with duplicate locations are filtered.  
// First names are combined into one string.
// Without this, there would be too many overlapping 
// dots on the map. Some member would be inaccessble.
function combineDuplicateLocations(members) {
    if (members.length == 0) {
        return nondups;
    }
    let firstnames = '';
    lng = members[0].geometry.coordinates[0];
    let dups = members.filter(
        member => member.geometry.coordinates[0] == lng);
    if (dups.length == 1) {
        nondups.push(dups[0]);
    }
    else {

        dups.forEach((dup, index) => {
            firstnames = firstnames.concat(dup.properties.First_Name);
            firstnames = firstnames.concat(', ');
        });
        firstnames = firstnames.slice(0, -2);
        dups[0].properties.First_Name = firstnames;
        nondups.push(dups[0]);
    }
    let remaining = members.filter(
        member => member.geometry.coordinates[0] != lng);
    combineDuplicateLocations(remaining);
    return nondups;
}
// Formats the properties of afeature to make reasonably well formatted popup.
async function formatPopUp(afeature) {
    let fp = afeature.properties;
    letloc = afeature.geometry.coordinates;
    let distance, drivetime;
    [distance, drivetime] = await fetchDrivingDistance(letloc, CHURCH);
    let cg1, cg2, cg3, cg4;
    [cg1, cg2, cg3, cg4] =
        [fp.Care_Giver_1, fp.Care_Giver_2, fp.Care_Giver_3, fp.Care_Giver_4];
    let care_string = ''
    if (fp.Receives_Care == 'Yes') {
        care_string = `<br>Receives Care: ${fp.Receives_Care}<br>`;
    }
    const nametitle = fp.Last_Name + ' - ' + fp.First_Name;

    return (`<strong>${nametitle}<br></strong>
                ${fp.Street_Address}<br>
                ${fp.City}, ${fp.State} ${fp.Zip} <br>
                ${fp.Mobile}<br>
                ${fp.Email}<br>
                To Church: ${distance} miles, ${drivetime} min
                ${care_string}
                ${cg1}
                ${cg2}
                ${cg3}
                ${cg4}`);
}


function createGeoGrid() {
    // This is a function
    const zip = (...arrays) => 
        arrays[0].map((_, c) => 
            arrays.map(row => row[c]));

    function createRange(start, end, increment) {
        const result = [];
        for (let i = start; i <= end; i += increment) {
            result.push(i);
        }
        return result;
    }
    const LNG_SPACE = 0.01750 * 2;
    const LAT_SPACE = 0.01480 * 2;
    const NOR_LAT = CHURCH[1] + (LAT_SPACE * 10);
    const SOU_LAT = CHURCH[1] - (LAT_SPACE * 10);
    const EST_LNG = CHURCH[0] + (LNG_SPACE * 10);
    const WST_LNG = CHURCH[0] - (LNG_SPACE * 10);

    const top_lat_lst = Array(22).fill(NOR_LAT);
    const btm_lat_lst = Array(21).fill(SOU_LAT);
    const lng_range = createRange(WST_LNG, EST_LNG, LNG_SPACE);
    const lat_range = createRange(SOU_LAT, NOR_LAT, LAT_SPACE);
    const topvert_coords = zip(lng_range, top_lat_lst);
    const btmvert_coords = zip(lng_range, btm_lat_lst);

    hor_set = zip(topvert_coords, btmvert_coords);

    let wst_lat_lst = Array(20).fill(WST_LNG);
    let est_lat_lst = Array(20).fill(EST_LNG);

    lfthor_coords = zip(wst_lat_lst, lat_range);
    rhthor_coords = zip(est_lat_lst, lat_range);
    ver_set = zip(lfthor_coords, rhthor_coords);
    hor_set = hor_set.map((coord) => coord.map((pair) =>
        pair.map((each) => each.toFixed(5))));
    ver_set = ver_set.map((coord) => coord.map((pair) =>
        pair.map((each) => each.toFixed(5))));
    grid_set = hor_set.concat(ver_set);

    let geo_collection = geoFeatureCollection();
    let feature_list = [];
    grid_set.forEach((each) => {
        feature_list.push(geoFeature(each, 'LineString'));

    });
    geo_collection.data.features = feature_list;
    return geo_collection;
}


let nondups = [];
async function main() {
    let all_group = null;
    let members_active = null;
    let members_eightyplus = null;
    let members_recievescare = null;

    await fetchData().then((data) => {
        all_group = createGeoJsonFrom(data);
        let allActive = extractActiveMembers(all_group);
        let remaining = removeChildren(allActive);
        [members_recievescare, remaining] = extractCareRecievers(remaining);

        [eightyplus, remaining] = extractEightyPlus(remaining);
        nondups = [];
        let eighty_combined = combineDuplicateLocations(eightyplus);
        members_eightyplus = getFeatureCollecton(eighty_combined);
        //   remaining = removeChildren(remaining);
        nondups = [];
        let dupscombined = combineDuplicateLocations(remaining);
        members_active = getFeatureCollecton(dupscombined);

        const map = new mapboxgl.Map({
            container: 'map',
            // Choose from Mapbox's core styles, or make your own style with Mapbox Studio
            style: 'mapbox://styles/mapbox/streets-v12',
            center: CHURCH,
            zoom: 10,
        });
        map.getCanvas().style.cursor = 'default';
        // map.showCollisionBoxes = true;

        map.loadImage('/static/img/red_dot.png', (error, image) => {
            if (error) throw error;
            map.addImage('red-dot', image); // Add the image to the map style
            map.addSource('members_eightyplus', { 'type': 'geojson', 'data': members_eightyplus });
            map.addLayer({
                'id': 'members_eightyplus',
                'type': 'symbol',
                'source': 'members_eightyplus',
                'layout': {
                    'text-field': ['get', 'Last_Name'],
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                    'text-radial-offset': 0.5,
                    // 'text-justify': 'auto',
                    'text-size': 11,
                    'text-ignore-placement': false,
                    'text-allow-overlap': true,  // Prevent label overlap
                    'icon-image': 'red-dot', // Customize the marker icon
                    'icon-size': 0.6, // Adjust the icon size
                    'icon-offset': [0, 0],
                    'icon-allow-overlap': true, // Allow icon overlap
                    'text-allow-overlap': true // Prevent label overlap},
                },
                "paint": {
                    "text-color": "red"
                }
            })
        });

        map.loadImage('/static/img/violet_dot.png', (error, image) => {
            if (error) throw error;
            map.addImage('violet_dot', image); // Add the image to the map style
            map.addSource('members_recievescare', { 'type': 'geojson', 'data': members_recievescare });
            map.addLayer({
                'id': 'members_recievescare',
                'type': 'symbol',
                'source': 'members_recievescare',
                'layout': {
                    'text-field': ['get', 'Last_Name'],
                    'text-variable-anchor': ['top', 'left', 'bottom', 'right'],
                    'text-radial-offset': 0.6,
                    'text-justify': 'auto',
                    'text-size': 10,
                    'text-ignore-placement': false,
                    'icon-image': 'violet_dot', // Customize the marker icon
                    'icon-size': 0.7, // Adjust the icon size
                    'icon-offset': [0, -10],
                    'icon-allow-overlap': true, // Allow icon overlap
                    'text-allow-overlap': true // Prevent label overlap},
                },
                'paint': {
                    "text-color": "#FF00FF"
                }
            });
        });

        map.loadImage('/static/img/darkblue_dot.png', (error, image) => {
            if (error) throw error;
            map.addImage('darkblue_dot', image); // Add the image to the map style
            map.addSource('members_active', { 'type': 'geojson', 'data': members_active });
            map.addLayer({
                'id': 'members_active',
                'type': 'symbol',
                'source': 'members_active',
                'layout': {
                    'text-field': ['get', 'Last_Name'],
                    'text-variable-anchor': ['top', 'left', 'bottom', 'right'],
                    'text-radial-offset': 0.7,
                    'text-justify': 'auto',
                    'text-size': 10,
                    'text-ignore-placement': false,
                    'icon-image': 'darkblue_dot', // Customize the marker icon
                    'icon-size': 0.6, // Adjust the icon size
                    'icon-offset': [0, -10],
                    'icon-allow-overlap': true, // Allow icon overlap
                    'text-allow-overlap': true // Prevent label overlap},
                },
                'paint': {
                    "text-color": "#000043"
                }
            });
        });

        map.loadImage('/static/img/church_icon.png', (error, image) => {
            if (error) throw error;
            map.addImage('button-church', image); // Add the image to the map style

            map.addSource('church', { 'type': 'geojson', 'data': CHURCH_LOCATION });
            map.addLayer({
                'id': 'church',
                'type': 'symbol',
                'source': 'church',
                'layout': {
                    'text-field': ['get', 'Last_Name'],
                    'text-variable-anchor': ['top', 'left', 'bottom', 'right'],
                    'text-radial-offset': 0.5,
                    'text-justify': 'auto',
                    'text-size': 10,
                    'text-ignore-placement': false,
                    'icon-image': 'button-church', // Customize the marker icon
                    'icon-size': 0.3, // Adjust the icon size
                    'icon-offset': [0, -10],
                    'icon-allow-overlap': true, // Allow icon overlap
                    'text-allow-overlap': true // Prevent label overlap},
                },
                'paint': {
                    "text-color": "blue"
                }
            });
        });

        map.on('load', function () {
            const grid = createGeoGrid();
            map.addSource("grid-source", grid);
            map.addLayer({
                id: "square_grid",
                type: 'line',
                source: "grid-source",
                paint: {
                    "line-color": 'gray',
                    'line-width': 1
                }
            });
        });
        const contextMenu = document.createElement('div');
        contextMenu.id = 'custom-context-menu';
        contextMenu.innerHTML = '<ul><li>Zoom In</li><li>Zoom Out</li></ul>';
        document.body.appendChild(contextMenu);

        map.on('contextmenu', function (e) {
            //e.preventDefault();
            const mouseX = e.originalEvent.clientX;
            const mouseY = e.originalEvent.clientY;
            const features = map.queryRenderedFeatures(e.point, { layers: ['members_active', 'church', 'members_eightyplus'] });
            if (features.length) {
                const layer = map.queryRenderedFeatures(e.point);
                console.log('Topmost feature:', features[0].geometry.coordinates);
            }
            else {
                const contextMenu = document.getElementById('custom-context-menu');
                contextMenu.style.left = mouseX + 'px';
                contextMenu.style.top = mouseY + 'px';
                contextMenu.style.visibility = "visible";
                console.log('basemap: ');
            }
        });

        const layers = ['members_active', 'church', 'members_eightyplus', 'members_recievescare', 'square_grid'];
        const button_labels = {
            'members_active': 'Active Members',
            'church': 'Church',
            'members_eightyplus': '80+',
            'members_recievescare': 'Receiving Care',
            'square_grid': 'Show/Hide Grid'
        };

        for (const layer of layers) {
            map.on('click', layer, (e) => {
                const feature = e.features[0]; // Get the clicked feature
                if (feature.source == 'grid-source') {
                    // this stop clicks on the grid line from creating a popup.
                    return;
                }
                formatPopUp(feature).then(poptext => {
                    // Create a unique popup for this circle
                     const popup = new mapboxgl.Popup()
                        .setLngLat(e.lngLat)
                        .setHTML(poptext)
                        .addTo(map);
                });
            });
        }

        // Create the Buttons
        for (const layer of layers) {
            const input = document.createElement(INPUT);
            input.type = CHECKBOX;
            input.id = layer;
            input.checked = true;
            filterGroup.appendChild(input);

            const label = document.createElement(LABEL);
            label.setAttribute('for', layer);
            label.textContent = button_labels[layer];
            filterGroup.appendChild(label);

            input.addEventListener('change', (e) => {
                const layer_visible = e.target.checked ? 'visible' : 'none';
                map.setLayoutProperty(layer, 'visibility', layer_visible);
            });
        }
    }); // end of await fetchData
}  // end of main

main();