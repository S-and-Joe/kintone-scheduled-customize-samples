# kintoneのカスタマイズを定期実行するサンプル集

kintoneのレコード一覧で動くJavaScriptカスタマイズを、毎日・毎月の決まった時刻に自動で実行するためのサンプルです。経過日数の更新、ルックアップの取り直し、別アプリへの転記など、9種類あります。

どのサンプルも、[カスタマイズ自動実行プラグイン](https://customize-auto-exe.s-joe.com/)で動かすことを前提にしています。このプラグインは、設定した時刻にkintoneの画面をクラウド上のブラウザで開き、その画面に適用されているカスタマイズをそのまま動かします。REST APIを呼ぶ別のプログラムに書き直す必要も、実行用のサーバーを用意する必要もありません。

## サンプルの一覧

| ファイル | 内容 | 実行の例 | 手順のページ |
|---|---|---|---|
| [elapsed-days.js](elapsed-days.js) | 日付フィールドからの経過日数（または年齢）を数値フィールドに書き込む | 毎日0:10 | [経過日数・年齢を毎日自動で更新する](https://customize-auto-exe.s-joe.com/recipe-elapsed-days.html) |
| [lookup-refresh.js](lookup-refresh.js) | ルックアップの値を取得し直す | 毎日 | [ルックアップを毎日自動で取得し直す](https://customize-auto-exe.s-joe.com/recipe-lookup-refresh.html) |
| [expire-status.js](expire-status.js) | 期限を過ぎたレコードのドロップダウンを「期限切れ」に書き換える | 毎晩 | [期限切れのレコードの状態を毎晩自動で更新する](https://customize-auto-exe.s-joe.com/recipe-expired-status.html) |
| [process-status.js](process-status.js) | 期限を過ぎたレコードのアクションを実行して、プロセス管理のステータスを進める | 毎日 | [プロセス管理のステータスを毎日自動で進める](https://customize-auto-exe.s-joe.com/recipe-process-status.html) |
| [related-total.js](related-total.js) | 別のアプリにあるレコードの合計と件数を、数値フィールドに書き込む | 毎日 | [関連レコードの合計を毎日自動で集計する](https://customize-auto-exe.s-joe.com/recipe-related-total.html) |
| [copy-records.js](copy-records.js) | 条件に合うレコードを、まだ転記していないものだけ別のアプリへ転記する | 毎晩 | [レコードを別のアプリへ毎晩自動で転記する](https://customize-auto-exe.s-joe.com/recipe-copy-records.html) |
| [monthly-records.js](monthly-records.js) | もとになるアプリの内容から、その月のレコードをまとめて作成する | 毎月1日 | [毎月のレコードを自動で作成する](https://customize-auto-exe.s-joe.com/recipe-monthly-records.html) |
| [delete-old-records.js](delete-old-records.js) | 保管の期間を過ぎたレコードを、日付と条件で絞って削除する | 毎月1日 | [古いレコードを毎月自動で削除する](https://customize-auto-exe.s-joe.com/recipe-delete-old-records.html) |
| [bulk-update-button.js](bulk-update-button.js) | レコード一覧に一括更新のボタンを追加する（ボタンを押す操作のほうを自動にする例） | 毎朝 | [カスタマイズの一括更新ボタンを毎朝自動で押す](https://customize-auto-exe.s-joe.com/recipe-button-press.html) |

アプリに用意するフィールド、ジョブの設定、注意点は、それぞれの手順のページに書いてあります。

## 使い方

1. サンプルのファイルの先頭にある定数（フィールドコード、アプリID、条件）を、自分のアプリに合わせて書き換えてください。
2. kintoneのアプリの設定で、「JavaScript / CSSでカスタマイズ」にファイルをアップロードしてください。
3. [導入ガイド](https://customize-auto-exe.s-joe.com/guide.html)の手順でプラグインを導入し、レコード一覧を開くジョブを作成してください。
4. ジョブの「今すぐ実行」を押して、結果を確かめてください。

## サンプルの仕組み

### 自動実行のときにだけ動かす

`bulk-update-button.js`以外のサンプルは、次の形をしています。

```js
kintone.events.on('app.record.index.show', async (event) => {
  const auto = window.__AUTO_EXECUTOR__;
  if (!auto) return event; // 人が一覧を開いたときは何もしない

  try {
    // ここに処理を書く
    auto.done();
  } catch (e) {
    auto.fail(e.message || JSON.stringify(e));
  }
  return event;
});
```

`window.__AUTO_EXECUTOR__`は、プラグインがジョブとして画面を開いたときにだけ存在します。人がレコード一覧を開いたときには処理が動きません。処理が終わったら`done()`を、失敗したら`fail(理由)`を呼ぶと、その結果が実行ログに記録されます。ジョブの「完了の判定」は「JSから done() を呼ぶ」にしてください。

### いまあるカスタマイズを書き換えずに動かす

`bulk-update-button.js`は、レコード一覧にボタンを追加する、よくある形のカスタマイズです。こちらは`window.__AUTO_EXECUTOR__`を使っていません。ジョブの「画面を開いた後の操作」で「クリックする」を選び、ボタンのCSSセレクタ（このサンプルでは`#reorder-check-button`）を指定してください。「完了の判定」は「通信が止まったら完了」、「確認ダイアログ」は「OKを押す」にします。人が押すのと同じようにボタンが押され、確認ダイアログも自動で進みます。すでに使っているカスタマイズやプラグインのボタンも、同じ方法で、コードを書き換えずに定期実行できます。

## 料金

ジョブ1件・月100回までの無料枠があり、期限はありません。クレジットカードの登録も不要です。くわしくは[料金のページ](https://customize-auto-exe.s-joe.com/pricing.html)をご覧ください。

## 関連するページ

- [kintoneの定期実行の方法と選び方](https://customize-auto-exe.s-joe.com/scheduled-execution.html)（REST APIを呼ぶプログラム、RPA、連携サービスとの違い）
- [よくある質問](https://customize-auto-exe.s-joe.com/faq.html)
- [ご利用の条件と制約](https://customize-auto-exe.s-joe.com/requirements.html)

## ライセンス

サンプルのコードはMITライセンスです。自由に書き換えてお使いください。

運営：合同会社エスアンドジョー

kintoneはサイボウズ株式会社の登録商標です。
