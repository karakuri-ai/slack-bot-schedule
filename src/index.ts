const postUrl = "https://hooks.slack.com/services/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"
const message = "たなかです"

function doPost(e) {
  const json = JSON.parse(e.parameters.payload.toString())
  if (json.type == "block_actions") {
    const responseUrl = json.response_url
    const people = json.actions[0].value
    const text = {"text" : '*:man-lifting-weights: `' + json.message.blocks[0].text.text + '` に決まりました :man-lifting-weights:*\n' + people} 
    const payload = JSON.stringify(text)
    const options = {
        "method": "post",
        "contentType": "application/json",
        "payload": payload
    };
    UrlFetchApp.fetch(responseUrl, options);
  }
}

      
function postToSlack() {
  const people = '<@U010SEMAGHH>' // @Naoto Tanaka
  const message = createHeadMessage(people)
  const suggest1 = createSuggest("11/03(水) 11:00 ~ 12:00", people)
  const suggest2 = createSuggest("11/04(木) 12:00 ~ 13:00", people)
  const suggest3 = createSuggest("11/05(金) 15:00 ~ 16:00", people)
  post(message)
  post(suggest1)
  post(suggest2)
  post(suggest3)
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
          "value": value,
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