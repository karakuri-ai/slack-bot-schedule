// Compiled using ts2gas 3.6.2 (TypeScript 3.9.5)
var LOG_SHEET = 'ログ';
var PERIOD = 30;
var OPENING_HOURS = 8;
var CLOSING_HOURS = 20;
var MAX_SUGGEST_EVENTS = 5


function getSuggestedEvents(title, people, timeSpan) {
    // イベント一覧をこのような配列で返して欲しいです
    // 例）people ['<@U010U6744NN>']　timeSpan 30
    // [{ start: '2020/06/25 15:00' end: '2020/06/27 16:00'}]
    // まだモックです
    if (!title) {
        title = 'テスト'
    }
    if (!people) {
        people = ['<@U010U6744NN>', '<@U010SEMAGHH>']
    }
    if (!timeSpan) {
        timeSpan = 30
    }
    var availableTimes = getCommonAvailableTime(people, timeSpan);
    var pastEvents = getPastEvents(title);
    var dates = pastEvents[0];
    var days = pastEvents[1];
    if (dates.length > 1) {
        availableTimes.sort(function(a, b){
            if (scoring(a, dates, days) > scoring(b, dates, days)){
                return 1;
            } else {
                return -1;
            }
        });
    }
    var suggestedEvents = [];
    for (i=0; i<Math.min(MAX_SUGGEST_EVENTS, availableTimes.length); i++) {
        if (availableTimes[i][0].getHours() === 8) {
            var endTime = new Date(availableTimes[i][1]);
            var startTime = new Date(availableTimes[i][1].setMinutes(availableTimes[i][1].getMinutes() - timeSpan));
        } else {
            var startTime = new Date(availableTimes[i][0]);
            var endTime = new Date(availableTimes[i][0].setMinutes(availableTimes[i][0].getMinutes() + timeSpan));
        }
        suggestedEvents.push({'start': Moment.moment(startTime).format('YYYY/MM/DD HH:mm'),
        'end': Moment.moment(endTime).format('YYYY/MM/DD HH:mm')});
    }
    return suggestedEvents;
}

function getCommonAvailableTime(people, timeSpan) {
    // デバッグ用
    if (!people) {
        people = ['<@U010U6744NN>', '<@U010SEMAGHH>']
    }
    if (!timeSpan) {
        timeSpan = 5
    }
    var calendars = people.map(function(id) {
        var gmail = convertSlackIDtoGmail(id);
        var calendar = CalendarApp.getCalendarById(gmail)
        return CalendarApp.getCalendarById(convertSlackIDtoGmail(id))
    });
    var today = new Date();

    var availableTimes= [];

    for (var d=0;d<PERIOD;d++) {
        var date = new Date();
        date.setDate(today.getDate() + d);

        var startTimes = [];
        var endTimes = [];

//        var continueFlag = false;
        for (var c=0;c<calendars.length;c++) {
            var events = calendars[c].getEventsForDay(date);

            for (var e=0;e<events.length;e++) {
//                if (events[e].isAllDayEvent()) {
//                    continueFlag = true;
//                    break;
//                }
                if (!events[e].isAllDayEvent()) {
                    var startTime = events[e].getStartTime().getTime();
                    var endTime = events[e].getEndTime().getTime();
                    startTimes.push(startTime);
                    endTimes.push(endTime);
                }
            }
        }
//        if (continueFlag) continue;

        var openingDateTime = date.setHours(OPENING_HOURS, 0, 0, 0);
        var closingDateTime = date.setHours(CLOSING_HOURS, 0, 0, 0);

        startTimes.unshift(0)
        startTimes.push(closingDateTime);

        if (d === 0) {
            endTimes.unshift(today.setHours(today.getHours() + 1, 0, 0, 0))
        } else {
            endTimes.unshift(openingDateTime);
        }
        endTimes.push(date.setHours(23, 59, 59, 999)); // end of day

        startTimes.sort();
        endTimes.sort();

        for (var i=0;i<startTimes.length-1;i++) {
            if (startTimes[i+1] - endTimes[i] >= timeSpan * 60 * 1000) {
                var startTimeString = new Date(startTimes[i+1]);
                var endTimeString = new Date(endTimes[i]);
                if (startTimeString.getDay() !== 0 && startTimeString.getDay() !== 6){
                    availableTimes.push([endTimeString, startTimeString])
                }
            }
        }
    }
    return availableTimes;
}

function getPastEvents(title) {
    if (!title) {
        title = 'テスト'
    }
    var ss = SpreadsheetApp.openById(SPREADSHHETID);
    var sheet = ss.getSheetByName(SCHEDULE_SHEET);
    var data = sheet.getDataRange().getValues();
    var sameTitleRows = findRows(sheet, title, 1);
    var dates = [];
    var days = [];
    for(var i=0;i<sameTitleRows.length;i++) {
        var date = data[sameTitleRows[i]][1]
        dates.push(date.getTime());
        days.push(date.getDay());
    }
    return [dates, days];
}

function findRows(sheet, value, col) {
    var data = sheet.getDataRange().getValues();
    var Rows = [];
    var lastRow = sheet.getLastRow();
    
    for(var i=0;i<lastRow;i++) {
        if(data[i][col-1].trim() === value) {
            Rows.push(i);
        }
    }
    return Rows;
}

// 低いほうがいいスコア
function scoring(availableTime, dates, days) {
    if (!availableTime) {
        availableTime = getCommonAvailableTime()[0]
    }
    if (!dates || !days){
        pastEvents = getPastEvents()
        dates = pastEvents[0]
        days = pastEvents[1]
    }
    dates = dates.sort()
    Logger.log(dates)
    var today = new Date();
    // 曜日の回数をカウント，曜日のランキングに応じてスコア
    var delta = [];
    for (var i=0;i<dates.length - 1;i++) {
        var diff = dates[i+1] - dates[i];
        delta.push(diff);
    }
    var averageDelta = average(delta);
    var rank = dayRank(days);
    var dayScore = rank.indexOf(availableTime[0].getDay());
    var dayDelta = availableTime[0].getTime() - dates[dates.length - 1];
    var dateScore = Math.floor(Math.abs(dayDelta / averageDelta - 1) * 2);
    var score = dayScore + dateScore;
    return score;
}

function average(arr) {
    var sum = 0;
    arr.forEach(function(elm) {
        sum += elm;
    });
    return sum / arr.length;
};

function dayRank(days) {
    var dayCount = [{'day': 1, 'value': 0}, {'day': 2, 'value': 0}, {'day': 3, 'value': 0}, {'day': 4, 'value': 0}, {'day': 5, 'value': 0}]
    for (var i=0;i<=days.length;i++) {
        if(days[i] === 1) {dayCount[0].value += 1}
        if(days[i] === 2) {dayCount[1].value += 1}
        if(days[i] === 3) {dayCount[2].value += 1}
        if(days[i] === 4) {dayCount[3].value += 1}
        if(days[i] === 5) {dayCount[4].value += 1}
    }
    dayCount.sort(function(a, b) {return b.value - a.value});
    var rank = []
    for (i=0;i<5;i++) {
      rank.push(dayCount[i].day)
    }
    return rank;
}
