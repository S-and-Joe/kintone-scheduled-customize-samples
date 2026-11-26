(() => {
  'use strict';

  const DATE_FIELD = '契約日'; // もとになる日付フィールドのフィールドコード
  const DAYS_FIELD = '経過日数'; // 書き込み先の数値フィールドのフィールドコード

  // きょうまでの日数(契約日の当日は0)
  const daysSince = (date) => {
    const [y, m, d] = date.split('-').map(Number);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - Date.UTC(y, m - 1, d)) / 86400000);
  };

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    try {
      const app = kintone.app.getId();
      let lastId = 0;
      for (;;) {
        // レコードを番号の順に100件ずつ読む
        const { records } = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
          app,
          fields: ['$id', DATE_FIELD, DAYS_FIELD],
          query: `$id > ${lastId} order by $id asc limit 100`,
        });
        if (records.length === 0) break;
        lastId = Number(records[records.length - 1].$id.value);

        // 日数が変わるレコードだけを書き換える
        const changed = records
          .filter((r) => r[DATE_FIELD].value)
          .map((r) => ({
            id: r.$id.value,
            days: String(daysSince(r[DATE_FIELD].value)),
            old: r[DAYS_FIELD].value,
          }))
          .filter((r) => r.days !== r.old)
          .map((r) => ({ id: r.id, record: { [DAYS_FIELD]: { value: r.days } } }));
        if (changed.length > 0) {
          await kintone.api(kintone.api.url('/k/v1/records.json', true), 'PUT', { app, records: changed });
        }
      }
      auto.done();
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
