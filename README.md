# Check branch name on pull_request
This action checks the branch name(`head_ref` and `base_ref`) on the pull_request.

# 概要
プルリクエストの `head_ref`(マージ元ブランチ) の名前を解析し、
`base_ref`(マージ先ブランチ)の名前と一致しなかったらエラーを出します。

意図しないブランチへの誤マージを事前に防ぐことができます。

例えば `head_ref` ブランチ名が `'feature@123'` だった場合、
`base_ref` の名前が `'feature'` と一致しない場合はエラーとなります。
(`head_ref` のブランチパス区切りのひとつ親の要素との一致を判定します)

他の例は以下の通りです。
| Require `base_ref` name | &#x2190; | `head_ref` |
| --------------------- | --- | ----------------------- |
| `'feature'`             | &#x2190; | `'feature@123'`           |
| `'feature'`             | &#x2190; | `'draft/feature@123'`     |
| `'feature-v2'`          | &#x2190; | `'feature-v2/123'`        |
| `'feature-v2'`          | &#x2190; | `'draft/feature-v2/123'`  |
| `'demo'`                | &#x2190; | `'demo/tmp'`              |
| always error<br>(default setting) | &#x2190; | `'release'` |

`head_ref` の名前が `'main'`, `'release'`, `'feature'`, `'tmp'` などの、
ブランチ区切りがない(ひとつ親の要素がない)ブランチ名が指定されている場合、
チェックをすべてエラーとします。
(オプション [`no-elem-headref`](#no-elem-headref) 設定ですべてパスさせることもできます)

# Usage

```yaml
on:
  # Only 'pull_request' event is supported for this action
  pull_request:
    types: [opened, edited, reopened, synchronize]

jobs:
  prcheck-job:
    runs-on: ubuntu-latest
    name: check PR branch name
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      # Check branch name action step
      - name: check PR branch name
        uses: mana544/check-pr-ref-name@v1
```
* このアクションは `'pull_request'` イベントトリガーのみ対応しています。
`'push'` など他のイベントトリガーでアクション起動した場合、エラーを送出します。

# ブランチの用語

    o    <== approved PR commit (merged into base branch)
    |\ 
    | o  <== `head_ref` (pull_request target commit)
    o    <== `base_ref` (merge base commit)

|    Word    |                  Description                   |
| ---------- | ---------------------------------------------- |
| `head_ref` | プルリク対象のブランチ(マージ元ブランチ)       |
| `base_ref` | プルリクを受け付けるブランチ(マージ先ブランチ) |


# 名前ルールフィルタ
たとえば、 `head_ref` が `'hotfix/0000'` という名前だった場合、
 `base_ref` が `'hotfix'` ではなく `'release'` ブランチや
 `'main'` ブランチに直接プルリクを出したいなどという運用もあるでしょう。
あるいは、 `head_ref` が `'release'` ブランチの時のプルリクは、
`base_ref` は `'main'` ブランチでしょう。

このように、 `base_ref` の名前からマージ先のブランチ名が特定できない場合を想定して、
名前ルールフィルタをオプションで設定することができます。

inputオプション [`name-rule-filter`](#name-rule-filter) も参照して下さい。

前述の例を実現したい場合、アクションのオプション
`'name-rule-filter'` に以下のようなJSONを設定します。
```yaml
# job, step記述は省略

      - name: check PR branch name
        uses: mana544/check-pr-ref-name@v1
        with:
          name-rule-filter: |
            [
              {
                "headref_element": "hotfix",
                "baseref_pattern": "^(release|main)$"
              },
              {
                "headref_element": "release",
                "baseref_pattern": "^main$"
              }
            ]
```

名前ルールフィルターを設定した場合、通常の一致判定は行いません(フィルターが優先されます)。
たとえば、 `head_ref` が `'hotfix@123'` だった場合、フィルター設定なしの場合だと
`base_ref` 名は `'hotfix'` と一致することを要求しますが、
上記フィルター設定をした場合は `'release'` or `'main'` と一致することを要求するようになり、
`'hotfix'` はひっかからなくなります。

# inputs(options)

|        Name        |  Default  |                   Description                    |
| ------------------ | --------- | ------------------------------------------------ |
| [`token`](#token)                      | `'${{ github.token }}'` | アクセストークン |
| [`no-elem-headref`](#no-elem-headref)  | `'error'` | `head_ref` 名に区切りがない(親要素がない)場合の挙動 |
| [`ref-delimiter`](#ref-delimiter)      | `'/@'`    | `head_ref` のパス区切り文字                         |
| [`name-rule-filter`](#name-rule-filter)| `'[]'`    | 名前ルールフィルター                             |

## token
アクセストークン。
プルリクコメントを書き込むときに利用しています。

## no-elem-headref
head_ref名に区切りがない(親要素がない)場合の挙動。
`'error'` or `'pass'` で指定。

| Option name | Description |
| ----------- | ----------- |
|`'error'` (Default)| エラーを送出してアクションを終了します。|
|`'pass'`           | ログメッセージを書き出してアクションを正常終了します。|

## ref-delimiter
head_refのパス区切り文字。
区切り文字を文字列として羅列してください。

## name-rule-filter
名前ルールフィルター。
JSONフォーマットで以下のエレメントを指定します。具体的な記述例は [名前ルールフィルタ](#名前ルールフィルタ) を参照のこと。

### <list[*]>.headref_element
(string) `head_ref` の親要素名。
親要素がない場合(区切り文字がない場合)は `head_ref` 名。
### <list[*]>.baseref_pattern
(string) `base_ref` の一致判定パターン。
正規表現文字列で指定。



-------------------

# このリポジトリのブランチ運用
```
main
|
+-- release
    |
    +-- feature
    |   |
    |   +-- feature@123
    |
    +-- hotfix@123
```




