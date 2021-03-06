/****************************************************************************
 * scheduleBar.js
 * openacousticdevices.info
 * November 2019
 *****************************************************************************/

'use strict';

/* global window, document */

const ui = require('./ui.js');
const timeHandler = require('./timeHandler.js');
const schedule = require('./schedule/schedule.js');

var timeCanvas = document.getElementById('time-canvas');
var timeContext = timeCanvas.getContext('2d');
var labelCanvas = document.getElementById('label-canvas');
var labelContext = labelCanvas.getContext('2d');

var canvasHolder = document.getElementById('canvas-holder');
var clickableCanvas;
var clickCallback;

var selectedPeriod = null;

/* Function to rescale */

function rescale (canvas) {

    var scaleFactor = 1;

    if (Object.prototype.hasOwnProperty.call(window, 'devicePixelRatio')) {

        if (window.devicePixelRatio > 1) {

            scaleFactor = window.devicePixelRatio;

        }

    }

    if (scaleFactor > 1) {

        canvas.width = canvas.width * scaleFactor;
        canvas.height = canvas.height * scaleFactor;

        canvas.style.width = canvas.width / scaleFactor + 'px';
        canvas.style.height = canvas.height / scaleFactor + 'px';

    }

}

function drawPeriod (startMins, endMins, timeCanvas) {

    var recX, recLen;

    /* width / 1440 minutes */
    recX = startMins * timeCanvas.width / 1440;
    recLen = (endMins - startMins) * timeCanvas.width / 1440;

    timeContext.fillRect(recX, 0, recLen, timeCanvas.height);

}

function updateCanvas () {

    var timePeriods, i, startMins, endMins, currentTimeDate, currentMins, currentX, localMidnight, localMidnightPx, startingAtMidnight, endingAtMidnight;

    timePeriods = schedule.getTimePeriods();
    timePeriods = ui.isLocalTime() ? timeHandler.convertTimePeriodsToLocal(timePeriods) : timePeriods;

    currentTimeDate = new Date();

    timeContext.clearRect(0, 0, timeCanvas.width, timeCanvas.height);

    localMidnight = timeHandler.convertTimeToLocal(1440);
    startingAtMidnight = false;
    endingAtMidnight = false;

    for (i = 0; i < timePeriods.length; i++) {

        startMins = timePeriods[i].startMins;
        endMins = timePeriods[i].endMins;

        if (ui.isLocalTime()) {

            /* If a time period is split across UTC midnight then set flags to enable the line denoting a split */

            if (startMins === localMidnight) {

                startingAtMidnight = true;

            }

            if (endMins === localMidnight) {

                endingAtMidnight = true;

            }

        }

        if (selectedPeriod !== null && (selectedPeriod.startMins === startMins && selectedPeriod.endMins === endMins)) {

            timeContext.fillStyle = '#007BFF';

        } else {

            timeContext.fillStyle = '#FF0000';

        }

        if (startMins > endMins) {

            drawPeriod(startMins, 1440, timeCanvas);
            drawPeriod(0, endMins, timeCanvas);

        } else if (startMins === endMins) {

            drawPeriod(0, 1440, timeCanvas);

        } else {

            drawPeriod(startMins, endMins, timeCanvas);

        }

    }

    if (startingAtMidnight && endingAtMidnight) {

        localMidnightPx = localMidnight / 1440 * timeCanvas.width;

        timeContext.fillStyle = '#CC0000';
        timeContext.fillRect(localMidnightPx, 0, 0.002 * timeCanvas.width, timeCanvas.height);

    }

    /* 6am, midday and 6pm markers */

    if (ui.isNightMode()) {

        timeContext.fillStyle = '#FFFFFF';

    } else {

        timeContext.fillStyle = '#000000';

    }

    timeContext.fillRect(0.25 * timeCanvas.width, 0, 0.002 * timeCanvas.width, timeCanvas.height);
    timeContext.fillRect(0.5 * timeCanvas.width, 0, 0.002 * timeCanvas.width, timeCanvas.height);
    timeContext.fillRect(0.75 * timeCanvas.width, 0, 0.002 * timeCanvas.width, timeCanvas.height);

    if (ui.isLocalTime()) {

        currentMins = (currentTimeDate.getHours() * 60) + currentTimeDate.getMinutes();

    } else {

        currentMins = (currentTimeDate.getUTCHours() * 60) + currentTimeDate.getUTCMinutes();

    }

    currentX = currentMins * timeCanvas.width / 1440;

    timeContext.fillStyle = '#00AF00';
    timeContext.fillRect((currentX - 1), 0, 0.004 * timeCanvas.width, timeCanvas.height);

}

exports.updateCanvas = updateCanvas;

/* Regularly update time period canvas so green line reflects current time */

function updateCanvasTimer () {

    updateCanvas();
    setTimeout(updateCanvasTimer, 60000);

}

/* Update which period is selected when schedule bar is clicked */

function updateSelectedPeriod (event) {

    var rect, clickMins, timePeriods, i, startMins, endMins, selectedIndex;

    timePeriods = schedule.getTimePeriods();

    /* If there's only one possible time period and it covers the entire length of the schedule, don't bother with the full check */

    if (timePeriods.length === 1 && timePeriods[0].startMins === 0 && timePeriods[0].endMins === 1440) {

        selectedIndex = 0;

        if (clickCallback) {

            clickCallback(selectedIndex);

        }

        return;

    }

    rect = clickableCanvas.getBoundingClientRect();
    clickMins = (event.clientX - rect.left) / clickableCanvas.width * 1440;

    if (ui.isLocalTime()) {

        timePeriods = timeHandler.convertTimePeriodsToLocal(timePeriods);

    }

    selectedIndex = -1;

    for (i = 0; i < timePeriods.length; i++) {

        startMins = timePeriods[i].startMins;
        endMins = timePeriods[i].endMins;

        if (startMins > endMins) {

            if ((clickMins >= startMins && clickMins < 1440) || (clickMins >= 0 && clickMins < endMins)) {

                selectedIndex = i;

            }

        } else {

            if (clickMins >= startMins && clickMins < endMins) {

                selectedIndex = i;

            }

        }

    }

    if (clickCallback) {

        clickCallback(selectedIndex);

    }

}

/* Set clicked period to specific index */

exports.setSelectedPeriod = function (period) {

    selectedPeriod = period;
    updateCanvas();

};

function clearSelectedPeriod () {

    selectedPeriod = null;
    updateCanvas();

};

exports.clearSelectedPeriod = clearSelectedPeriod;

/* Draw labels below time period canvas */

function drawTimeLabels () {

    var fontSize = 0.32 * timeCanvas.height;

    labelContext.clearRect(0, 0, labelCanvas.width, labelCanvas.height);

    labelContext.font = fontSize + 'pt Helvetica';

    if (ui.isNightMode()) {

        labelContext.fillStyle = '#FFFFFF';

    } else {

        labelContext.fillStyle = '#000000';

    }

    labelContext.fillText('00:00', 0, fontSize);
    labelContext.fillText('06:00', 0.225 * timeCanvas.width, fontSize);
    labelContext.fillText('12:00', 0.475 * timeCanvas.width, fontSize);
    labelContext.fillText('18:00', 0.725 * timeCanvas.width, fontSize);
    labelContext.fillText('24:00', 0.945 * timeCanvas.width, fontSize);

}

exports.drawTimeLabels = drawTimeLabels;

exports.prepareScheduleCanvas = function (clickable, callback) {

    var offset;

    clickCallback = null;

    if (clickable) {

        clickCallback = callback;

        clickableCanvas = document.createElement('canvas');

        clickableCanvas.id = 'clickable-canvas';
        clickableCanvas.width = timeCanvas.width;
        clickableCanvas.height = timeCanvas.height;

        clickableCanvas.style.position = 'absolute';

        clickableCanvas.style.left = '50%';
        offset = -1 * clickableCanvas.width / 2;
        clickableCanvas.style.marginLeft = offset + 'px';

        clickableCanvas.style.top = timeCanvas.offsetTop + 'px';

        canvasHolder.appendChild(clickableCanvas);

        clickableCanvas.addEventListener('click', updateSelectedPeriod);

    }

    /* Rescale for resolution of screen */
    rescale(timeCanvas);
    rescale(labelCanvas);

    /* Draw labels below timeline */
    drawTimeLabels();

    /* Start recursive loop which keep canvas up to date */
    updateCanvasTimer();

};

exports.setSchedule = function (timePeriods) {

    var tps = timePeriods;

    tps = timeHandler.sortPeriods(tps);

    schedule.setTimePeriods(tps);
    updateCanvas();

};

exports.getTimePeriods = schedule.getTimePeriods;
exports.getSunPeriods = schedule.getSunPeriods;
exports.MAX_PERIODS = schedule.MAX_PERIODS;
