(() => {
  'use strict';

  const DUE_FIELD = '有効期限'; // 期限の日付フィールドのフィールドコード
  const FROM_STATUS = '見積中'; // 進める前のステータス
  const ACTION = '失効にする'; // 実行するアクション(プロセス管理で付けた名前)

  kintone.events.on('app.record.index.show', async (event) => {
    const auto = window.__AUTO_EXECUTOR__;
    if (!auto) return event; // 人が一覧を開いたときは何もしない

    try {
      const app = kintone.app.getId();
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      // プロセス管理のステータスのフィールドコードを調べる(アプリによって違うため)
      const fieldsUrl = kintone.api.url('/k/v1/app/form/fields.json', true);
      const { properties } = await kintone.api(fieldsUrl, 'GET', { app });
      const status = Object.values(properties).find((p) => p.type === 'STATUS').code;
      const condition = `${DUE_FIELD} != "" and ${DUE_FIELD} < "${today}" and ${status} in ("${FROM_STATUS}")`;
      let lastId = 0;
      for (;;) {
        // 期限がきのうまでで、ステータスがまだ進んでいないレコードを、番号の順に100件ずつ読む
        const { records } = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
          app,
          fields: ['$id'],
          query: `${condition} and $id > ${lastId} order by $id asc limit 100`,
        });
        if (records.length === 0) break;
        lastId = Number(records[records.length - 1].$id.value);

        // アクションを実行して、ステータスを進める
        await kintone.api(kintone.api.url('/k/v1/records/status.json', true), 'PUT', {
          app,
          records: records.map((r) => ({ id: r.$id.value, action: ACTION })),
        });
      }
      auto.done();
    } catch (e) {
      auto.fail(e.message || JSON.stringify(e));
    }
    return event;
  });
})();
