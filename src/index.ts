const postUrl = PropertiesService.getScriptProperties().getProperty(
  "WEB_HOOK_URL"
);
const SPREADSHHETID = PropertiesService.getScriptProperties().getProperty(
  "SPREAD_SHEET_ID"
);
const ACCOUNT_SHEET = PropertiesService.getScriptProperties().getProperty(
  "ACCOUNT_SHEET_NAME"
);
const SCHEDULE_SHEET = PropertiesService.getScriptProperties().getProperty(
  "SCHEDULE_SHEET_NAME"
);
const HOSTACCOUNT = PropertiesService.getScriptProperties().getProperty(
  "HOST_ACCOUNT"
); // <@U010U6744NN>

type PostEvent = {
  parameters: any,
  parameter: any,
};

function doPost(e: PostEvent) {
  if (e.parameters.payload) {
    fromSlack(e);
  } else {
    fromForm(e);
  }
}

function fromForm(e: PostEvent) {
  const userName = e.parameter.user_name; // 投稿したユーザーの名前を取ってくる
  const text = e.parameter.text; // 投稿されたテキストを取ってくる
  // 申請フォームから投稿されたメッセージかどうかを判定する
  if (userName != "slackbot" || !text.match(/Oh_No/)) return; //投稿ユーザーがslackbotだった場合＆申請フォームという文言が入っていない場合はリターン
  const parsedText = parseForm(text);
  const { title, description, people, timeSpan } = parsedText;
  const events = getSuggestedEvents(
    title,
    people.map((person) => person.replace(/\s/g, "")),
    parseInt(timeSpan.replace(/\s/g, ""), 10)
  );
  postToSlack({
    title,
    description,
    people: people.join(",").replace(/\s/g, ""),
    events,
  });
}

function fromSlack(e: PostEvent) {
  const json = JSON.parse(e.parameters.payload.toString());
  const responseUrl = json.response_url;
  const { people, title, start, end, description } = JSON.parse(
    json.actions[0].value
  );
  const text = {
    text:
      "*:man-lifting-weights: `" +
      json.message.blocks[0].text.text +
      "` に決まりました :man-lifting-weights:*\n" +
      people,
  };
  const payload = JSON.stringify(text);
  const options = {
    method: "post",
    contentType: "application/json",
    payload: payload,
  };
  const ss = SpreadsheetApp.openById(SPREADSHHETID);
  const sheet = ss.getSheetByName(SCHEDULE_SHEET);
  const items = people.split(",");
  sheet.appendRow([
    title,
    start,
    end,
    items[0],
    items[1],
    items[2],
    items[3],
    items[4],
    items[5],
    items[6],
    description,
  ]);
  registerSchedule({ people, start, end, title, description });
  UrlFetchApp.fetch(responseUrl, options);
}

function parseForm(text: string) {
  const splitText = text.split("*");
  const [, , , , title, , timeSpan, ...others] = splitText;
  const description = others.pop();
  const parsedText = {
    title,
    timeSpan,
    people: others.filter((person) => /<(.*)?>/.test(person)),
    description,
  };
  return parsedText;
}

type Event = {
  start: string,
  end: string,
};

type Props = {
  title: string,
  people: string,
  events: Event[],
  description: string,
};

const dayMap = new Map([
  ["Sunday", "日"],
  ["Monday", "月"],
  ["Tuesday", "火"],
  ["Wednesday", "水"],
  ["Thursday", "木"],
  ["Friday", "金"],
  ["Saturday", "土"],
]);

function postToSlack({ title, people, events, description }: Props) {
  var message = createHeadMessage(people);
  post(message);
  events.forEach(({ start, end }) => {
    const headlineEn = `${Moment.moment(start).format(
      `MM/DD（dddd） HH:mm`
    )} ~ ${Moment.moment(end).format("HH:mm")}`;
    const headline = headlineEn.replace(/（(.*)?）/, (text, p1) => {
      return `（${dayMap.get(p1)}）`;
    });
    const suggest = createSuggest(headline, {
      title,
      people,
      start,
      end,
      description,
    });
    post(suggest);
  });
}

/**
 * @param string 参加者のユーザーIDを一覧文字列
 * ex.) '<@U010SEMAGHH><@V010SEFAGGO>'
 */
function createHeadMessage(people: string) {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${people}\nみんなが空いている日を5つピックアップしたよ。\n参加者は可能な日にリアクションをつけてね。`,
        },
      },
      {
        type: "divider",
      },
    ],
  };
}

/**
 * 日付候補のJSON文字列を生成
 */
function createSuggest(
  text: string,
  value: {
    title: string,
    people: string,
    start: string,
    end: string,
    description: string,
  }
) {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: text,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "この日に決める",
          },
          style: "primary",
          value: JSON.stringify(value),
          action_id: "button",
        },
      },
    ],
  };
}

type PostData = {
  blocks: (
    | {
        type: string,
        text: {
          type: string,
          text: string,
        },
      }
    | {
        type: string,
        text?: undefined,
      }
  )[],
};

/*
 * SlackのWebhookを叩く
 */
function post(jsonStr: PostData) {
  var payload = JSON.stringify(jsonStr);
  var options = {
    method: "post",
    contentType: "application/json",
    payload: payload,
  };
  UrlFetchApp.fetch(postUrl, options);
}

function createEvents({
  title,
  id,
  start,
  end,
  description,
  people,
}: {
  title: string,
  id: string,
  start: string,
  end: string,
  description: string,
  people: string,
}) {
  const guests = people
    .split(",")
    .map((person) => convertSlackIDtoGmail(person))
    .filter((person) => !!person)
    .join(",");
  const calendar = CalendarApp.getCalendarById(id);
  const startTime = new Date(start);
  const endTime = new Date(end);
  const option = {
    description,
    guests,
  };

  calendar.createEvent(title, startTime, endTime, option);
}

function registerSchedule({
  people,
  start,
  end,
  title,
  description,
}: {
  people: string,
  start: string,
  end: string,
  title: string,
  description: string,
}) {
  const gmail = convertSlackIDtoGmail(HOSTACCOUNT);
  createEvents({
    id: gmail,
    start,
    end,
    title,
    description,
    people,
  });
}

function convertSlackIDtoGmail(slackID: string) {
  const searchID = slackID.replace(/<\@(.*)?>/, "$1");
  const spreadsheet = SpreadsheetApp.openById(SPREADSHHETID);
  const sheet = spreadsheet.getSheetByName(ACCOUNT_SHEET);
  const data = sheet.getDataRange().getValues();
  const item = data.find((row) => {
    if (row[2] === searchID) {
      return true;
    }
    return false;
  });
  return item[1];
}
