//declaration of global variables for later in the code
var options;
var locationDB;
var authEmail;
var locationTimer;
var scoutTimer;
var out;
var config;
var map;
var mapOptions;
var markers = [];
var locationRefreshRate;
var backgroundMode;
var userScope;
var latitude;
var longitude;

//jQuery init for pull to refresh
//seen later in People tab
$(document).ready(function() {

    $(document).delegate("#findLocation", "pageinit", function(event, data) {

        $(".iscroll-wrapper", this).bind({

            iscroll_onpulldown: function() {

                setTimeout(function() {

                    //empties the list of previous users
                    $("#users").empty();

                    //loops through all the people in the database
                    locationDB.ref().once("value").then(function(snapshot) {

                        snapshot.forEach(function(childSnapshot) {

                            var key = childSnapshot.key;

                            //THIS CONVERSION HAS TO BE DONE,
                            //SINCE THE DATABASE CANNOT HANDLE
                            //THESE SYMBOLS IN EMAIL ADDRESSES
                            key = key.replace("(dot)", ".");
                            key = key.replace("(hashtag)", "#");
                            key = key.replace("(dollarsign)", "$)");
                            key = key.replace("(forwardslash)", "/");

                            //adds the username to the list
                            $("#users").append("<li><a href='#' onclick='goToUserPage(\"" + key + "\")'>" + key + "</a></li>");

                        });

                        //refreshes the list
                        $("#users").listview("refresh");

                    });

                    //refreshes again: this is so the list will display
                    $("#users").listview("refresh");

                }, 250); //has a short delay so users can register animation

            }

        });

    });

});

//initialize the init function
window.onload = function() {

    document.addEventListener("deviceready", init, false);

};

//this is the core code
function init() {

    //add support for back button navigaton for Android
    document.addEventListener("backbutton", function(e) {

        if ($.mobile.activePage.is('#login')) {

            e.preventDefault();
            navigator.app.exitApp();

        } else {

            navigator.app.backHistory();

        }

    }, false);

    //styling for buttons
    //document.getElementById("btnStart").style.display = "block";
    //document.getElementById("btnStop").style.display = "block";
    document.getElementById("btnLocation").style.display = "block";

    //Google Maps options
    options = {maximumAge: 3000, timeout: 5000, enableHighAccuracy: true};

    //locationDB is the reference to the database: used continuously
    config = {
        apiKey: "AIzaSyBAFA-nNGUuVL4tiUmdjn-1Wz23iChHERk",
        authDomain: "find-me-app.firebaseapp.com",
        databaseURL: "https://find-me-app.firebaseio.com",
        storageBucket: "firebase-find-me-app.appspot.com",
    };

    firebase.initializeApp(config);

    locationDB = firebase.database();

    //sets up a launch counter:
    //this knows if user is new or old
    var oldLaunches = window.localStorage.getItem("launches");

    if (oldLaunches) {

        //add one to the counter
        window.localStorage.setItem("launches", oldLaunches++);

        //if 10th multiple of use, prompt them to rate on the Play Store
        if (oldLaunches % 10 === 0) {

            var showRating = confirm("Enjoying our app? We would appreciate if you could take a minute or two and drop us a rating.");

            if (showRating === true) {

                window.open("https://play.google.com/store/apps/details?id=com.shreypandya.findme");

            }

        }

    } else {

        //if no launch counter is present, then they are new
        //we then welcome them, setup the counter, and set
        //default values for vital variables
        navigator.notification.alert("Welcome to Find.me! We hope you enjoy our app!", null, "Welcome!", "Ok");
        window.localStorage.setItem("launches", 1);
        window.localStorage.setItem("locationRefreshRate", 5000);

    }

    //gets previously saved locationRefreshRate (how fast the map will reload)
    locationRefreshRate = window.localStorage.getItem("locationRefreshRate");

    //gets previously saved backgroundMode (whether to enable or not)
    backgroundMode = window.localStorage.getItem("backgroundMode");

    //if background mode is enabled,
    //enable the library and set
    /*the default message for it
    if (backgroundMode == "true") {

        cordova.plugins.backgroundMode.enable();

        cordova.plugins.backgroundMode.setDefaults({
            title: "Find.me",
            text: "Locating you in background..."
        });

    }
    */

    //gets previously saved rememberMe (whether or not to save password)
    var rememberMe = window.localStorage.getItem("rememberMe");

    //if true, retrieve the password and start the login process
    if (rememberMe == "true") {

        document.getElementById("email").value = window.localStorage.getItem("email");
        document.getElementById("password").value = window.localStorage.getItem("password");
        document.getElementById("rememberMe").checked = true;

        login();

    }

}

function login() {

    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;

    var rememberMe = document.getElementById("rememberMe").value;

    //if rememberMe box is checked, save user and pass to memory
    if (rememberMe == "on") {

        window.localStorage.setItem("email", email);
        window.localStorage.setItem("password", password);
        window.localStorage.setItem("rememberMe", "true");

    }

    //handled by Firebase for security
    firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error){

        navigator.notification.alert("Error signing in: " + error.message, null, "Error", "Try Again");
        return;

    });

    //wait until login is complete, then keep going
    firebase.auth().onAuthStateChanged(function(user) {

        if (user) {

            authEmail = user.email;

            //THIS CONVERSION HAS TO BE DONE,
            //SINCE THE DATABASE CANNOT HANDLE
            //THESE SYMBOLS IN EMAIL ADDRESSES
            authEmail = authEmail.replace(".", "(dot)");
            authEmail = authEmail.replace("#", "(hashtag)");
            authEmail = authEmail.replace("$", "(dollarsign)");
            authEmail = authEmail.replace("/", "(forwardslash)");

            //change screen
            window.location.href = "#findLocation";

            startLocating();
        }
    });

}

function signup() {

    var signupEmail = document.getElementById("signupEmail").value;
    var signupPassword = document.getElementById("signupPassword").value;
    var confirmPassword = document.getElementById("confirmPassword").value;

    if (signupPassword.length < 8) {

        navigator.notification.alert("Password is too short: make sure it is 8 characters or more.", null, "Error", "Try Again");

    } else {

        if (confirmPassword == signupPassword) {

            //again, handled by Firebase
            firebase.auth().createUserWithEmailAndPassword(signupEmail, signupPassword).catch(function(error){

                navigator.notification.alert("Error creating account: " + error, null, "Error", "Try Again");
                return;

            });

            firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error){

                navigator.notification.alert("Error signing in: " + error.message, null, "Error", "Try Again");
                return;

            });

            user = firebase.auth().currentUser;

            navigator.notification.alert("Account created and signed in!", null, "Success!", "Ok");
            authEmail = user.email;

            //THIS CONVERSION HAS TO BE DONE, SINCE THE
            //DATABASE CANNOT HANDLE THESE SYMBOLS IN EMAIL ADDRESSES
            authEmail = authEmail.replace(".", "(dot)");
            authEmail = authEmail.replace("#", "(hashtag)");
            authEmail = authEmail.replace("$", "(dollarsign)");
            authEmail = authEmail.replace("/", "(forwardslash)");

            //set default coords
            locationDB.ref(authEmail).set({

                location: {

                    latitude: 0,
                    longitude: 0

                }

            });

            //change screen
            window.location.href = "#findLocation";

            startLocating();

        } else {

            navigator.notification.alert("Passwords do not match.", "Error", "Try Again");

        }

    }

}

//this is for updating location
function startLocating() {

    document.getElementById("btnLocation").innerHTML = "Stop Locating";
    document.getElementById("btnLocation").onclick = stopLocating;

    document.getElementById("btnCenter").style.display = "block";

    getLocation();

    //sets up a timer that runs every interval specified by locationRefreshRate
    locationTimer = setInterval(updateLocation, locationRefreshRate);

}

function stopLocating() {

    document.getElementById("btnLocation").innerHTML = "Start Locating";
    document.getElementById("btnLocation").onclick = startLocating;

    document.getElementById("btnCenter").style.display = "none";

    //deletes the timer
    clearInterval(locationTimer);

}

function centerOnMap() {

    map.setCenter(new google.maps.LatLng(latitude, longitude));

}

/*when background mode is enabled, this is run
cordova.plugins.backgroundMode.onactivate = function() {

    locationTimer = setInterval(function() {

        navigator.geolocation.getCurrentPosition(updateLocationBackground, failure, options);

    }, locationRefreshRate);

};
*/

//this runs from background mode
function updateLocationBackground() {

    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    locationDB.ref(authEmail + "/location").update({

        latitude: latitude,
        longitude: longitude

    });

}

function startScouting() {

    document.getElementById("btnScout").innerHTML = "Stop Scouting";
    document.getElementById("btnScout").onclick = stopScouting;
    
    getScoutInfo();

    //sets up timer for scout mode
    scoutTimer = setInterval(getScoutInfo, locationRefreshRate);

}

function stopScouting() {

    document.getElementById("btnScout").innerHTML = "Start Scouting";
    document.getElementById("btnScout").onclick = startScouting;

    //deletes timer for scout mode
    clearInterval(scoutTimer);

}

function getScoutInfo() {

    navigator.geolocation.getCurrentPosition(scoutSuccess, failure, options);

}

function scoutSuccess(position) {

    //clears the output string
    $("#scoutInfo").empty();

    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    locationDB.ref(authEmail + "/location").update({

        latitude: latitude,
        longitude: longitude

    });

    //loops through database
    locationDB.ref().once("value").then(function(snapshot) {

        snapshot.forEach(function(childSnapshot) {

            //gets path to username, then narrows down to only username
            var snapshotVal = childSnapshot.ref.toString();
            var snapshotArr = snapshotVal.split("/");
            var locatingUser = snapshotArr[3];

            //gets rid of the web link formatting and database formatting
            locatingUser = locatingUser.replace("%40", "@");
            locatingUser = locatingUser.replace("(dot)", ".");

            //this is the raw location data from database
            var key = childSnapshot.val();

            //if not your own location, then proceed
            if (!(key.location.latitude == latitude && key.location.longitude == longitude)) {

                //complicated math done to convert latitude and longitude into feet
                //out += "<p>Distance from " + locatingUser + ": " + Math.min(convertCoordsToFeet(Math.abs(key.location.latitude - latitude)), convertCoordsToFeet(Math.abs(key.location.longitude - longitude))) + " feet</p>";

                var distance = findDistance(key.location.latitude, key.location.longitude, latitude, longitude);

                var distanceInMiles = false;

                if (distance > 5280) {

                    distanceInMiles = true;
                    distance = Math.round(distance / 5280);

                    $("#scoutInfo").append("<li>" + locatingUser + ": " + distance + " miles</li>");

                } else {

                    $("#scoutInfo").append("<li>" + locatingUser + ": " + distance + " feet</li>");

                }

            }

        });

    });

}

function findDistance(lat1, lon1, lat2, lon2) {
    var R = 20903520; //feet
    var φ1 = lat1*(Math.PI/180);
    var φ2 = lat2*(Math.PI/180);
    var Δφ = (lat2-lat1)*(Math.PI/180);
    var Δλ = (lon2-lon1)*(Math.PI/180);

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

function getDegrees(lat1, lon1, lat2, lon2, headX) {

    var dLat = (Math.PI/180)*(lat2-lat1);
    var dLon = (Math.PI/180)*(lon2-lon1);

    lat1 = (Math.PI/180)*(lat1);
    lat2 = (Math.PI/180)*(lat2);

    var y = Math.sin(dLon) * Math.cos(lat2);
    var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    var brng = (180/Math.PI)(Math.atan2(y, x));

    // fix negative degrees
    if(brng<0) {
        brng=360-Math.abs(brng);
    }

    return brng - headX;
}

//this is for updating location
function updateLocation() {

    navigator.geolocation.getCurrentPosition(updateSuccess, failure, options);

}

function updateSuccess(position) {

    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    var out = "<strong>Latitude:</strong>" + latitude;
    out += "<br/><strong>Longitude:</strong>" + longitude;

    document.getElementById("result").innerHTML = out;

    locationDB.ref(authEmail + "/location").update({

        latitude: latitude,
        longitude: longitude

    });

    var latLng = new google.maps.LatLng(latitude, longitude);

    for (i = 0; i < markers.length; i++) {

        markers[i].setMap(null);

    }

    //marker array
    markers = [];

    //loop through database
    locationDB.once("value").then(function(snapshot) {

        snapshot.forEach(function(childSnapshot) {

            //gets path to username, then narrows down to only username
            var snapshotVal = childSnapshot.ref.toString();
            var snapshotArr = snapshotVal.split("/");

            //gets rid of the web link formatting and database formatting
            var locatingUser = snapshotArr[3];
            locatingUser = locatingUser.replace("%40", "@");
            locatingUser = locatingUser.replace("(dot)", ".");

            //this is the raw location data from database
            var key = childSnapshot.val();

            //alert(key);

            var latLng = new google.maps.LatLng(key.location.latitude, key.location.longitude);

            //create new marker
            //NOTE: setting the marker to a variable
            //causes the markers to all have the name
            //of the last user in the database

            //add to marker array
            markers.push(new google.maps.Marker({
                position: latLng,
                map: map,
                title: locatingUser
            }).addListener("click", function() {

                navigator.notification.alert("User: " + locatingUser, null, "User Info", "Ok");

            }));

        });

    });

}

//THIS IS FOR FIRST TIME LOCATING,
//since it sets up the Google Map
function getLocation() {

    navigator.geolocation.getCurrentPosition(success, failure, options);

}

function success(position) {

    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    var out = "<strong>Latitude:</strong>" + latitude;
    out += "<br/><strong>Longitude:</strong>" + longitude;

    //prints out latitude and longitude
    document.getElementById("result").innerHTML = out;

    //set up map center
    var latLng = new google.maps.LatLng(latitude, longitude);

    //set up map options
    mapOptions = {
        center: latLng,
        zoom: 8,
        streetViewControl: false,
        mapTypeControlOptions: {
            mapTypeIds: google.maps.MapTypeId.ROADMAP
        },
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    //create the map
    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

    //update coordinates
    locationDB.ref(authEmail + "/location").update({

        latitude: latitude,
        longitude: longitude

    });

    //loop thru database
    locationDB.ref().once("value", function(snapshot) {

        snapshot.forEach(function(childSnapshot) {

            //get username from database link
            var snapshotVal = childSnapshot.ref.toString();
            var snapshotArr = snapshotVal.split("/");

            //convert username to readable
            var locatingUser = snapshotArr[3];
            locatingUser = locatingUser.replace("%40", "@");
            locatingUser = locatingUser.replace("(dot)", ".");

            //raw location data
            var key = childSnapshot.val();

            var latLng = new google.maps.LatLng(key.location.latitude, key.location.longitude);

            //create new marker
            //NOTE: setting the marker to a variable
            //causes the markers to all have the name
            //of the last user in the database

            //add to marker array
            markers.push(new google.maps.Marker({
                position: latLng,
                map: map,
                title: locatingUser
            }).addListener("click", function() {

                navigator.notification.alert("User: " + locatingUser, null, "User Info", "Ok");

            }));

        });

    });

}

function failure(message) {

    navigator.notification.alert("Error: " + message.message, null, "Error", "Try Again");

}

function switchToSettings() {

    window.location.href = "#settings";
    locationRefreshRate = window.localStorage.getItem("locationRefreshRate");

    //set dropdown menu to previous value
    switch (locationRefreshRate) {

        case 5000:
            document.getElementById("locationRefreshRate").value = "5000";
            break;
        case 30000:
            document.getElementById("locationRefreshRate").value = "30000";
            break;
        case 60000:
            document.getElementById("locationRefreshRate").value = "60000";
            break;
        case 300000:
            document.getElementById("locationRefreshRate").value = "300000";
            break;
        case 1800000:
            document.getElementById("locationRefreshRate").value = "1800000";
            break;
        case 3600000:
            document.getElementById("locationRefreshRate").value = "3600000";
            break;
    }

}

function saveSettings() {

    //save variables to memory
    locationRefreshRate = parseInt(document.getElementById("locationRefreshRate").value);
    window.localStorage.setItem("locationRefreshRate", locationRefreshRate);

    backgroundMode = document.getElementById("backgroundMode").value;
    window.localStorage.setItem("backgroundMode", backgroundMode);

    //set up background mode
    if (backgroundMode == "on") {

        cordova.plugins.backgroundMode.enable();
        cordova.plugins.backgroundMode.setDefaults({
            title: "Find.me",
            text: "Locating you in background..."
        });

    }

    //save more variables
    userScope = document.getElementById("userScope").value;
    window.localStorage.setItem("userScope", userScope);

    window.location.href = "#findLocation";

}

//sets up user page based on selection (from People tab)
function goToUserPage(username) {

    window.location.href = "#user_page";

    $("#user_title").html(username);

}

function friendUser() {

    var updatedObj = {};
    var friendUsername = $("#user_title").text();

    //the dreaded database conversion
    friendUsername = friendUsername.replace(".", "(dot)");
    friendUsername = friendUsername.replace("#", "(hashtag)");
    friendUsername = friendUsername.replace("$", "(dollarsign)");
    friendUsername = friendUsername.replace("/", "(forwardslash)");

    //prevent friending yourself
    if (authEmail == friendUsername) {

        navigator.notification.alert("Wow. Are you that lonely that you have to friend YOURSELF?", function() {

            //go back to location page
            window.location.href = "#findLocation";

        }, "Hold on...");

    } else {

        //this is necessary so that the name in the database
        //can be the value of the variable
        updatedObj[friendUsername] = "friend";

        locationDB.ref(authEmail + "/friends").update(updatedObj);

        //go back to location page
        window.location.href = "#findLocation";

    }

}

function saveFriendSettings() {

    var updatedObj = {};
    var friendUsername = $("#user_title").text();

    //replacing database formatting... again...
    friendUsername = friendUsername.replace(".", "(dot)");
    friendUsername = friendUsername.replace("#", "(hashtag)");
    friendUsername = friendUsername.replace("$", "(dollarsign)");
    friendUsername = friendUsername.replace("/", "(forwardslash)");

    //friending yourself prevention
    if (authEmail == friendUsername) {

        navigator.notification.alert("Wow. Are you that lonely that you have to friend YOURSELF?", function() {

            //send back to location page
            window.location.href = "#findLocation";

        }, "Hold on...");

    } else {

        //again, needed so the name in the database
        //can be the value of the variable
        updatedObj[friendUsername] = document.getElementById("relationFriend").value;

        locationDB.ref(authEmail + "/friends").update(updatedObj);

        //back to location page
        window.location.href = "#findLocation";

    }

}