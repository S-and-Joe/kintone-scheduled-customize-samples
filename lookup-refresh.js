(() => {
  'use strict';

  const LOOKUP_FIELD = '顧客コード'; // 取得し直すルックアップフィールドのフィールドコード

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    const app = kintone.app.getId();
    const url = kintone.api.url('/k/v1/records.json', true);
    const failed = [];
    try {
      let lastId = 0;
      for (;;) {
        // レコードを番号の順に100件ずつ読む
        const { records } = await kintone.api(url, 'GET', {
          app,
          fields: ['$id', LOOKUP_FIELD],
          query: `$id > ${lastId} order by $id asc limit 100`,
        });
        if (records.length === 0) break;
        lastId = Number(records[records.length - 1].$id.value);

        // ルックアップに同じ値を入れ直すと、コピー先のフィールドが取得し直される
        const updates = records
          .filter((r) => r[LOOKUP_FIELD].value)
          .map((r) => ({ id: r.$id.value, record: { [LOOKUP_FIELD]: { value: r[LOOKUP_FIELD].value } } }));
        if (updates.length === 0) continue;
        try {
          await kintone.api(url, 'PUT', { app, records: updates });
        } catch (e) {
          // 参照先にない値が混ざっていると、まとめての更新は失敗する。1件ずつやり直して、失敗したレコードを控える
          for (const u of updates) {
            try {
              await kintone.api(url, 'PUT', { app, records: [u] });
            } catch (e2) {
              failed.push(u.id);
            }
          }
        }
      }
      if (failed.length > 0) {
        auto.fail(`取得し直せなかったレコード: ${failed.join(', ')}`);
      } else {
        auto.done();
      }
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
