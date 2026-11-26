(() => {
  'use strict';

  const SOURCE_APP = 0; // 転記元のアプリのアプリID
  const SOURCE_QUERY = '状態 in ("完了")'; // 転記するレコードの条件
  const KEY_FIELD = '元レコード番号'; // このアプリの数値フィールド(転記元のレコード番号を入れる)

  // 転記元のレコードから、このアプリのレコードを組み立てる
  const build = (src) => ({
    [KEY_FIELD]: { value: src.$id.value },
    顧客名: { value: src.顧客名.value },
    金額: { value: src.金額.value },
    計上日: { value: src.完了日.value },
  });

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    try {
      const app = kintone.app.getId();
      const url = kintone.api.url('/k/v1/records.json', true);
      let lastId = 0;
      for (;;) {
        // 転記元から、条件に合うレコードを番号の順に100件ずつ読む
        const { records: sources } = await kintone.api(url, 'GET', {
          app: SOURCE_APP,
          query: `(${SOURCE_QUERY}) and $id > ${lastId} order by $id asc limit 100`,
        });
        if (sources.length === 0) break;
        lastId = Number(sources[sources.length - 1].$id.value);

        // そのうち、すでに転記してあるものを調べる
        const ids = sources.map((s) => s.$id.value).join(',');
        const { records: copied } = await kintone.api(url, 'GET', {
          app,
          fields: [KEY_FIELD],
          query: `${KEY_FIELD} in (${ids}) limit 500`,
        });
        const done = new Set(copied.map((r) => r[KEY_FIELD].value));

        // まだ転記していないものだけを作成する
        const records = sources.filter((s) => !done.has(s.$id.value)).map(build);
        if (records.length > 0) await kintone.api(url, 'POST', { app, records });
      }
      auto.done();
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
