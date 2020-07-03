/****************************************************************************
 * timeHandler.js
 * openacousticdevices.info
 * November 2019
 *****************************************************************************/

function getConnections (periods) {

    var i, j, connections;

    connections = [];

    for (i = 0; i < periods.length; i++) {

        connections[i] = -1;

        for (j = 0; j < periods.length; j++) {

            if ((periods[i].startMins === 0 && periods[j].endMins === 1440) || (periods[i].endMins === 1440 && periods[j].startMins === 0)) {

                connections[i] = j;

            }

        }

    }

    return connections;

}

exports.getConnections = getConnections;

function sortPeriods (periods) {

    var sortedPeriods = periods.sort(function (a, b) {

        return a.startMins - b.startMins;

    });

    return sortedPeriods;

}

exports.sortPeriods = sortPeriods;

/* Calculate the current offset from UTC */

function calculateTimezoneOffsetMins () {

    var currentDate = new Date();
    return (-1 * currentDate.getTimezoneOffset());

}

exports.calculateTimezoneOffsetMins = calculateTimezoneOffsetMins;

function calculateTimezoneOffsetHours () {

    return (calculateTimezoneOffsetMins() / 60);

}

exports.calculateTimezoneOffsetHours = calculateTimezoneOffsetHours;

function convertTimeToLocal (time) {

    var timezoneOffset;

    /* Offset is given as UTC - local time in minutes */

    timezoneOffset = calculateTimezoneOffsetMins();

    time = (time + timezoneOffset) % 1440;

    /* If time zone offset move time over midnight */

    if (time < 0) {

        time += 1440;

    }

    return time;

}

exports.convertTimeToLocal = convertTimeToLocal;

function convertTimePeriodToLocal (timePeriod) {

    var startMins, endMins;

    startMins = convertTimeToLocal(timePeriod.startMins);
    endMins = convertTimeToLocal(timePeriod.endMins);

    return {
        startMins: startMins,
        endMins: endMins
    };

}

/* See if any periods are over midnight and have to be split */

function checkTimePeriodsForSplits (localTimePeriods) {

    var i, localTimePeriod;

    for (i = 0; i < localTimePeriods.length; i++) {

        localTimePeriod = localTimePeriods[i];

        if (localTimePeriod.startMins > localTimePeriod.endMins) {

            localTimePeriods.splice(i, 1);

            localTimePeriods.push({
                startMins: localTimePeriod.startMins,
                endMins: 1440
            });
            localTimePeriods.push({
                startMins: 0,
                endMins: localTimePeriod.endMins
            });

        }

    }

    return localTimePeriods;

}

exports.checkTimePeriodsForSplits = checkTimePeriodsForSplits;

/* See if any newly created time periods overlap and can be merged */

function checkTimePeriodsForOverlaps (localTimePeriods) {

    var i, j;

    for (i = 0; i < localTimePeriods.length; i++) {

        for (j = 0; j < localTimePeriods.length; j++) {

            if (localTimePeriods[i].endMins === localTimePeriods[j].startMins) {

                localTimePeriods[i].endMins = localTimePeriods[j].endMins;
                localTimePeriods.splice(j, 1);

                return checkTimePeriodsForOverlaps(localTimePeriods);

            }

        }

    }

    return localTimePeriods;

}

exports.checkTimePeriodsForOverlaps = checkTimePeriodsForOverlaps;

/* Convert a list of time periods from UTC to local */

function convertTimePeriodsToLocal (tps) {

    var localTimePeriods, i, timePeriod, localTimePeriod;

    localTimePeriods = [];

    for (i = 0; i < tps.length; i++) {

        timePeriod = tps[i];
        localTimePeriod = convertTimePeriodToLocal(timePeriod);

        localTimePeriods.push({
            startMins: localTimePeriod.startMins,
            endMins: localTimePeriod.endMins
        });

    }

    return localTimePeriods;

}

exports.convertTimePeriodsToLocal = convertTimePeriodsToLocal;

/* Convert a time in mins to UTC */

function convertTimetoUTC (time) {

    var timezoneOffset;

    /* Offset is given as UTC - local time in minutes */

    timezoneOffset = calculateTimezoneOffsetMins();

    time = (time - timezoneOffset) % 1440;

    /* If time zone offset move time over midnight */

    if (time < 0) {

        time += 1440;

    }

    return time;

}

exports.convertTimetoUTC = convertTimetoUTC;

/* Check if the given times need to be altered to match the app's current time zone setting */

function convertTimePeriodToUTC (timePeriod) {

    var startMins, endMins;

    startMins = convertTimetoUTC(timePeriod.startMins);
    endMins = convertTimetoUTC(timePeriod.endMins);

    /* If the start and end times are the same, the time period covers the entire day */

    if (startMins === endMins) {

        return timePeriod;

    }

    return {
        startMins: startMins,
        endMins: endMins
    };

}

exports.convertTimePeriodToUTC = convertTimePeriodToUTC;

/* Convert a list of local time periods to UTC */

exports.convertLocalTimePeriodsToUTC = function (localTimePeriods) {

    var utcTimePeriods, i, localTimePeriod, utcTimePeriod;

    utcTimePeriods = [];

    for (i = 0; i < localTimePeriods.length; i++) {

        localTimePeriod = localTimePeriods[i];

        utcTimePeriod = convertTimePeriodToUTC(localTimePeriod);

        utcTimePeriods.push({
            startMins: utcTimePeriod.startMins,
            endMins: utcTimePeriod.endMins
        });

    }

    utcTimePeriods = checkTimePeriodsForSplits(utcTimePeriods);

    utcTimePeriods = sortPeriods(utcTimePeriods);

    utcTimePeriods = checkTimePeriodsForOverlaps(utcTimePeriods);

    return utcTimePeriods;

};

/* Get the text representation of the current timezone */

function getTimezoneText (localTime) {

    var timezoneText, timezoneOffset, timezoneOffsetHours, timezoneOffsetMins;

    timezoneText = 'UTC';

    if (localTime) {

        /* Offset is given as UTC - local time */

        timezoneOffset = calculateTimezoneOffsetHours();

        timezoneOffsetHours = Math.floor(timezoneOffset);
        timezoneOffsetMins = Math.abs(timezoneOffset - timezoneOffsetHours) * 60;

        if (timezoneOffset !== 0) {

            if (timezoneOffset > 0) {

                timezoneText += '+';

            }

            timezoneText += timezoneOffsetHours;

            if (timezoneOffsetMins > 0) {

                timezoneText += ':' + timezoneOffsetMins;

            }

        }

    }

    return timezoneText;

}

exports.getTimezoneText = getTimezoneText;

/* Pad the left of each time with zeroes */

function pad (n) {

    return (n < 10) ? ('0' + n) : n;

}

/* Convert the number of minutes through a day to a HH:MM formatted string */

function minsToTimeString (mins) {

    var timeHours = Math.floor(mins / 60);

    return pad(timeHours) + ':' + pad((mins - (timeHours * 60)));

}

exports.minsToTimeString = minsToTimeString;
