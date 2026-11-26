(() => {
  'use strict';

  const DATE_FIELD = '完了日'; // 古さを判定する日付フィールドのフィールドコード
  const KEEP_DAYS = 365; // この日数より前のレコードを削除する
  const EXTRA_QUERY = '状態 in ("完了")'; // 削除してよいレコードの条件。日付だけで決めるなら空のまま

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    try {
      const app = kintone.app.getId();
      const d = new Date();
      d.setDate(d.getDate() - KEEP_DAYS);
      const pad = (n) => String(n).padStart(2, '0');
      const border = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const extra = EXTRA_QUERY ? ` and (${EXTRA_QUERY})` : '';
      const condition = `${DATE_FIELD} != "" and ${DATE_FIELD} < "${border}"${extra}`;
      for (;;) {
        // 条件に合うレコードを100件読み、削除する。なくなるまで繰り返す
        const { records } = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
          app,
          fields: ['$id'],
          query: `${condition} order by $id asc limit 100`,
        });
        if (records.length === 0) break;
        await kintone.api(kintone.api.url('/k/v1/records.json', true), 'DELETE', {
          app,
          ids: records.map((r) => r.$id.value),
        });
      }
      auto.done();
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
