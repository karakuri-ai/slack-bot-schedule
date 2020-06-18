declare namespace SlackApp {

  class Slack {
    postMessage(channel: string, message: string, option: Record<string, any>)
  }

  export const create: (token: string) => Slack;
}