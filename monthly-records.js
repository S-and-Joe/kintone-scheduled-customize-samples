(() => {
  'use strict';

  const SOURCE_APP = 0; // もとになるアプリ(契約の一覧など)のアプリID
  const SOURCE_QUERY = '状態 in ("契約中")'; // 作成の対象にするレコードの条件
  const MONTH_FIELD = '対象月'; // このアプリの日付フィールド(その月の1日を入れる)
  const KEY_FIELD = '契約番号'; // このアプリの数値フィールド(もとのレコード番号を入れる)

  // もとのレコードから、今月分のレコードを組み立てる
  const build = (src, month) => ({
    [MONTH_FIELD]: { value: month },
    [KEY_FIELD]: { value: src.$id.value },
    顧客名: { value: src.顧客名.value },
    金額: { value: src.月額.value },
  });

  // 条件に合うレコードを、番号の順に100件ずつすべて読む
  const readAll = async (app, condition, fields) => {
    const all = [];
    let lastId = 0;
    for (;;) {
      const { records } = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
        app,
        fields,
        query: `${condition ? `(${condition}) and ` : ''}$id > ${lastId} order by $id asc limit 100`,
      });
      if (records.length === 0) return all;
      all.push(...records);
      lastId = Number(records[records.length - 1].$id.value);
    }
  };

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    try {
      const app = kintone.app.getId();
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      // 今月分がすでにあるものは作らない(同じ月に2回動いても、重複しない)
      const existing = await readAll(app, `${MONTH_FIELD} = "${month}"`, ['$id', KEY_FIELD]);
      const done = new Set(existing.map((r) => r[KEY_FIELD].value));
      const sources = await readAll(SOURCE_APP, SOURCE_QUERY);
      const records = sources.filter((s) => !done.has(s.$id.value)).map((s) => build(s, month));

      // 100件ずつ作成する
      for (let i = 0; i < records.length; i += 100) {
        await kintone.api(kintone.api.url('/k/v1/records.json', true), 'POST', {
          app,
          records: records.slice(i, i + 100),
        });
      }
      auto.done();
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
