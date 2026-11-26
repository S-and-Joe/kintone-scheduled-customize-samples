(() => {
  'use strict';

  kintone.events.on('app.record.index.show', (event) => {
    if (document.getElementById('reorder-check-button')) return event;

    const button = document.createElement('button');
    button.id = 'reorder-check-button';
    button.textContent = '発注要否を一括更新';
    button.addEventListener('click', async () => {
      if (!confirm('すべてのレコードの発注要否を更新します。よろしいですか？')) return;
      button.disabled = true;
      try {
        const app = kintone.app.getId();
        let lastId = 0;
        let count = 0;
        for (;;) {
          const { records } = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
            app,
            fields: ['$id', '在庫数', '発注点', '発注要否'],
            query: `$id > ${lastId} order by $id asc limit 100`,
          });
          if (records.length === 0) break;
          lastId = Number(records[records.length - 1].$id.value);

          const changed = records
            .map((r) => ({
              id: r.$id.value,
              now: r.発注要否.value,
              next: Number(r.在庫数.value) < Number(r.発注点.value) ? '要発注' : '不要',
            }))
            .filter((r) => r.now !== r.next);
          if (changed.length > 0) {
            await kintone.api(kintone.api.url('/k/v1/records.json', true), 'PUT', {
              app,
              records: changed.map((r) => ({ id: r.id, record: { 発注要否: { value: r.next } } })),
            });
            count += changed.length;
          }
        }
        alert(`${count}件を更新しました。`);
        location.reload();
      } catch (e) {
        alert('更新に失敗しました：' + (e.message || JSON.stringify(e)));
        button.disabled = false;
      }
    });
    kintone.app.getHeaderMenuSpaceElement().appendChild(button);
    return event;
  });
})();
