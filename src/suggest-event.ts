function getSuggestedEvents(people: string[], timeSpan: number) {
  // イベント一覧をこのような配列で返して欲しいです
  // 例）people ['<@U010U6744NN>']　timeSpan 30
  // [{ start: '2020/06/25 15:00' end: '2020/06/27 16:00'}]
  // まだモックです
  return [
      { start: "2020/06/26 15:00", end: '2020/06/26 16:00' },
      { start: "2020/06/27 15:00", end: '2020/06/27 16:00' }
  ];
}