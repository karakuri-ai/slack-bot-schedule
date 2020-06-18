const postUrl = 'https://hooks.slack.com/services/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'
const username = 'botbot'
const icon = ':hatching_chick:'
const message = 'testだよ'

function test() {
  const json =
  {
     "username" : username,
     "icon_emoji": icon,
     "text" : message
  }
  const payload = JSON.stringify(json)

  const options =
  {
    "method" : "post",
    "contentType" : "application/json",
    "payload" : payload
  }

  UrlFetchApp.fetch(postUrl, options)
}
