declare namespace SlackApp {

  class Slack {
    postMessage(channel: string, message: string, option: Record<string, any>)
  }

  export const create: (token: string) => Slack;
}

import * as ImportedMoment from 'moment'

declare namespace Moment {
  export const moment: typeof ImportedMoment;
}