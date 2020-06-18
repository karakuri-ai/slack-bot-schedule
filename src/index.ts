import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
const slackToken = 'R64aI0bkI7NZbEWOoO6dZI6S';

function test() {
  const slackApp = SlackApp.create(slackToken);
  const channelId = "#times_hori";
  // 投稿するメッセージ
  const message = "TestMessage";
　//
  const options = {
  }
  slackApp.postMessage(channelId, message, options);
}
