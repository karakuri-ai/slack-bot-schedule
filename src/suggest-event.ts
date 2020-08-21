const PERIOD = 30;
const OPENING_HOURS = 8;
const CLOSING_HOURS = 20;
const MAX_SUGGEST_EVENTS = 5;

function getSuggestedEvents(title: string, people: string[], timeSpan: number) {
  const availableTimes = getCommonAvailableTime(people, timeSpan);
  const pastEvents = getPastEvents(title);
  const dates = pastEvents[0];
  const days = pastEvents[1];
  if (dates.length > 1) {
    availableTimes.sort((a, b) => {
      if (scoring(a, dates, days) > scoring(b, dates, days)) {
        return 1;
      } else {
        return -1;
      }
    });
  }
  const suggestedEvents: { start: string, end: string }[] = [];
  for (
    let i = 0;
    i < Math.min(MAX_SUGGEST_EVENTS, availableTimes.length);
    i++
  ) {
    let endTime: Date;
    let startTime: Date;
    if (availableTimes[i][0].getHours() === 8) {
      endTime = new Date(availableTimes[i][1]);
      startTime = new Date(
        availableTimes[i][1].setMinutes(
          availableTimes[i][1].getMinutes() - timeSpan
        )
      );
    } else {
      startTime = new Date(availableTimes[i][0]);
      endTime = new Date(
        availableTimes[i][0].setMinutes(
          availableTimes[i][0].getMinutes() + timeSpan
        )
      );
    }
    suggestedEvents.push({
      start: Moment.moment(startTime).format("YYYY/MM/DD HH:mm"),
      end: Moment.moment(endTime).format("YYYY/MM/DD HH:mm"),
    });
  }
  return suggestedEvents;
}

function getCommonAvailableTime(people?: string[], timeSpan?: number) {
  if (!timeSpan) {
    timeSpan = 5;
  }
  const calendars = people.map((id) => {
    return CalendarApp.getCalendarById(convertSlackIDtoGmail(id));
  });
  const today = new Date();
  const availableTimes = [];

  for (let d = 0; d < PERIOD; d++) {
    const date = new Date();
    date.setDate(today.getDate() + d);

    const startTimes = [];
    const endTimes = [];

    for (let c = 0; c < calendars.length; c++) {
      const events = calendars[c].getEventsForDay(date);

      for (let e = 0; e < events.length; e++) {
        if (!events[e].isAllDayEvent()) {
          const startTime = events[e].getStartTime().getTime();
          const endTime = events[e].getEndTime().getTime();
          startTimes.push(startTime);
          endTimes.push(endTime);
        }
      }
    }

    const openingDateTime = date.setHours(OPENING_HOURS, 0, 0, 0);
    const closingDateTime = date.setHours(CLOSING_HOURS, 0, 0, 0);

    startTimes.unshift(0);
    startTimes.push(closingDateTime);

    if (d === 0) {
      endTimes.unshift(today.setHours(today.getHours() + 1, 0, 0, 0));
    } else {
      endTimes.unshift(openingDateTime);
    }
    endTimes.push(date.setHours(23, 59, 59, 999)); // end of day

    startTimes.sort();
    endTimes.sort();

    for (let i = 0; i < startTimes.length - 1; i++) {
      if (startTimes[i + 1] - endTimes[i] >= timeSpan * 60 * 1000) {
        const startTimeString = new Date(startTimes[i + 1]);
        const endTimeString = new Date(endTimes[i]);
        if (startTimeString.getDay() !== 0 && startTimeString.getDay() !== 6) {
          availableTimes.push([endTimeString, startTimeString]);
        }
      }
    }
  }
  return availableTimes;
}

function getPastEvents(title?: string) {
  const ss = SpreadsheetApp.openById(SPREADSHHETID);
  const sheet = ss.getSheetByName(SCHEDULE_SHEET);
  const data = sheet.getDataRange().getValues();
  const sameTitleRows = findRows(sheet, title, 1);
  const dates = [];
  const days = [];
  for (let i = 0; i < sameTitleRows.length; i++) {
    const date = data[sameTitleRows[i]][1];
    dates.push(date.getTime());
    days.push(date.getDay());
  }
  return [dates, days];
}

function findRows(sheet: GoogleAppsScript.Spreadsheet.Sheet, value: string, col: number) {
  const data = sheet.getDataRange().getValues();
  const Rows = [];
  const lastRow = sheet.getLastRow();

  for (let i = 0; i < lastRow; i++) {
    if (data[i][col - 1].trim() === value) {
      Rows.push(i);
    }
  }
  return Rows;
}

// 低いほうがいいスコア
function scoring(availableTime, dates, days) {
  if (!availableTime) {
    availableTime = getCommonAvailableTime()[0];
  }
  if (!dates || !days) {
    const pastEvents = getPastEvents();
    dates = pastEvents[0];
    days = pastEvents[1];
  }
  dates = dates.sort();
  // 曜日の回数をカウント，曜日のランキングに応じてスコア
  const delta = [];
  for (let i = 0; i < dates.length - 1; i++) {
    const diff = dates[i + 1] - dates[i];
    delta.push(diff);
  }
  const averageDelta = average(delta);
  const rank = dayRank(days);
  const dayScore = rank.indexOf(availableTime[0].getDay());
  const dayDelta = availableTime[0].getTime() - dates[dates.length - 1];
  const dateScore = Math.floor(Math.abs(dayDelta / averageDelta - 1) * 2);
  const score = dayScore + dateScore;
  return score;
}

function average(arr: number[]) {
  let sum = 0;
  arr.forEach(function (elm) {
    sum += elm;
  });
  return sum / arr.length;
}

function dayRank(days) {
  const dayCount = [
    { day: 1, value: 0 },
    { day: 2, value: 0 },
    { day: 3, value: 0 },
    { day: 4, value: 0 },
    { day: 5, value: 0 },
  ];
  for (let i = 0; i <= days.length; i++) {
    if (days[i] === 1) {
      dayCount[0].value += 1;
    }
    if (days[i] === 2) {
      dayCount[1].value += 1;
    }
    if (days[i] === 3) {
      dayCount[2].value += 1;
    }
    if (days[i] === 4) {
      dayCount[3].value += 1;
    }
    if (days[i] === 5) {
      dayCount[4].value += 1;
    }
  }
  dayCount.sort(function (a, b) {
    return b.value - a.value;
  });
  const rank = [];
  for (let i = 0; i < 5; i++) {
    rank.push(dayCount[i].day);
  }
  return rank;
}
