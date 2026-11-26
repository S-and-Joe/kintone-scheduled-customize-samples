(() => {
  'use strict';

  const DUE_FIELD = '期限'; // 期限の日付フィールドのフィールドコード
  const STATUS_FIELD = '状態'; // 状態のドロップダウンのフィールドコード
  const FROM = '有効'; // 書き換える前の値
  const TO = '期限切れ'; // 書き換えた後の値

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    try {
      const app = kintone.app.getId();
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      let lastId = 0;
      const condition = `${DUE_FIELD} != "" and ${DUE_FIELD} < "${today}" and ${STATUS_FIELD} in ("${FROM}")`;
      for (;;) {
        // 期限がきのうまでで、状態がまだ変わっていないレコードを、番号の順に100件ずつ読む(期限が空のレコードは除く)
        const { records } = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
          app,
          fields: ['$id'],
          query: `${condition} and $id > ${lastId} order by $id asc limit 100`,
        });
        if (records.length === 0) break;
        lastId = Number(records[records.length - 1].$id.value);

        await kintone.api(kintone.api.url('/k/v1/records.json', true), 'PUT', {
          app,
          records: records.map((r) => ({ id: r.$id.value, record: { [STATUS_FIELD]: { value: TO } } })),
        });
      }
      auto.done();
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
