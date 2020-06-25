const postUrl = "https://hooks.slack.com/services/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"
const message = "たなかです"

function doPost(e) {
  const json = JSON.parse(e.parameters.payload.toString())
  if (json.type == "block_actions") {
    const responseUrl = json.response_url
    const { people, title, start, end, description } = JSON.parse(json.actions[0].value)
    const text = {"text" : '*:man-lifting-weights: `' + json.message.blocks[0].text.text + '` に決まりました :man-lifting-weights:*\n' + people} 
    const payload = JSON.stringify(text)
    const options = {
        "method": "post",
        "contentType": "application/json",
        "payload": payload
    };
    registerSchedule({ people, start, end, title, description });
    UrlFetchApp.fetch(responseUrl, options);
  }
}

type Event = {
  start: string;
  end: string;
}

type Props = {
  title: string;
  people: string;
  events: Event[];
  description: string;
}
      
function postToSlack({ title, people, events, description }: Props) {
  var message = createHeadMessage(people);
  post(message);
  events.forEach(({start, end}) => {
    const suggest = createSuggest(`${start} ~ ${end}`, {
      title,
      people,
      start,
      end,
      description
    });
    post(suggest);
  });
}

/**
 * @param string 参加者のユーザーIDを一覧文字列 
 * ex.) '<@U010SEMAGHH><@V010SEFAGGO>'
 */
function createHeadMessage(people) {
  return {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `${people}\nみんなが空いている日を3つピックアップしたよ。\n参加者は可能な日にリアクションをつけてね。`
        }
      },
      {
        "type": "divider"
      }
    ]
  }
}

/**
 * 日付候補のJSON文字列を生成
 */
function createSuggest(text, value) {
  return {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": text,
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "この日に決める"
          },
          "style": "primary",
          "value": JSON.stringify(value),
          "action_id": "button"
        }
      }
    ]
  }
}

/*
 * SlackのWebhookを叩く
 */
function post(jsonStr) {
    var payload = JSON.stringify(jsonStr);
    var options = {
        "method": "post",
        "contentType": "application/json",
        "payload": payload
    };
    UrlFetchApp.fetch(postUrl, options);
}

function createEvents({ title, id, start, end, description }) {
  const calendar = CalendarApp.getCalendarById(id);
  const startTime = new Date(start);
  const endTime = new Date(end);
  const option = {
    description,
  }
  
  calendar.createEvent(title, startTime, endTime, option);
}

function registerSchedule({ people, start, end, title, description } : { people: string, start: string, end: string, title: string, description: string }) {
  const persons = people.split(',');
  persons.forEach((person) => {
    const gmail = convertSlackIDtoGmail(person);
    createEvents({
      id: gmail,
      start,
      end,
      title,
      description,
    })
  })
}

function convertSlackIDtoGmail(slackID: string) {
  const searchID = slackID.replace(/<\@(.*)?>/, '$1');
  const sheet = SpreadsheetApp.getActiveSheet()
  const data  = sheet.getDataRange().getValues();
  const item = data.find((row) => {
    if (row[2] === searchID) {
      return true
    }
    return false
  })
  return item[1]
}

function test() {
  const people = '<@U010U6744NN>'; // @Naoto Tanaka
  const title = '打ち合わせ';
  const description = '打ち合わせURLはこちらです。zoomURL: https://zoom.us/**/**';
  const events = [{ start: "2020/06/26 15:00", end: '2020/06/26 16:00' }, { start: "2020/06/27 15:00", end: '2020/06/27 16:00' }]
  postToSlack({ title, description, people, events });
}