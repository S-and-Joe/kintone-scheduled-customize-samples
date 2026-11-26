(() => {
  'use strict';

  const DETAIL_APP = 0; // 集計するアプリ(明細側)のアプリID
  const DETAIL_KEY = '顧客コード'; // 明細側で、集計先のレコードを指すフィールドのフィールドコード
  const DETAIL_AMOUNT = '金額'; // 明細側の、合計する数値フィールドのフィールドコード
  const DETAIL_QUERY = ''; // 集計に含める明細の条件(例: '状態 in ("受注")')。全件なら空のまま
  const KEY_FIELD = '顧客コード'; // このアプリの、明細と突き合わせるフィールドのフィールドコード
  const SUM_FIELD = '売上合計'; // このアプリの、合計を入れる数値フィールドのフィールドコード
  const COUNT_FIELD = '案件数'; // このアプリの、件数を入れる数値フィールドのフィールドコード

  // 条件に合うレコードを、番号の順に500件ずつすべて読む
  const readAll = async (app, condition, fields) => {
    const all = [];
    let lastId = 0;
    for (;;) {
      const { records } = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
        app,
        fields: ['$id', ...fields],
        query: `${condition ? `(${condition}) and ` : ''}$id > ${lastId} order by $id asc limit 500`,
      });
      all.push(...records);
      if (records.length < 500) return all;
      lastId = Number(records[records.length - 1].$id.value);
    }
  };

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    try {
      // 明細を読み、キーごとに合計と件数を出す
      const totals = new Map();
      for (const d of await readAll(DETAIL_APP, DETAIL_QUERY, [DETAIL_KEY, DETAIL_AMOUNT])) {
        const key = d[DETAIL_KEY].value;
        if (!key) continue;
        const t = totals.get(key) || { sum: 0, count: 0 };
        t.sum += Number(d[DETAIL_AMOUNT].value || 0);
        t.count += 1;
        totals.set(key, t);
      }

      // このアプリのレコードのうち、値が変わるものだけを書き換える
      const app = kintone.app.getId();
      const changed = [];
      for (const r of await readAll(app, '', [KEY_FIELD, SUM_FIELD, COUNT_FIELD])) {
        const t = totals.get(r[KEY_FIELD].value) || { sum: 0, count: 0 };
        const same = r[SUM_FIELD].value !== ''
          && Number(r[SUM_FIELD].value) === t.sum
          && Number(r[COUNT_FIELD].value || 0) === t.count;
        if (same) continue;
        changed.push({
          id: r.$id.value,
          record: { [SUM_FIELD]: { value: t.sum }, [COUNT_FIELD]: { value: t.count } },
        });
      }
      for (let i = 0; i < changed.length; i += 100) {
        await kintone.api(kintone.api.url('/k/v1/records.json', true), 'PUT', {
          app,
          records: changed.slice(i, i + 100),
        });
      }
      auto.done();
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
