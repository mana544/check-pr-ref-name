const core = require('@actions/core');
const github = require('@actions/github');


try {
    console.log("Current Dir:" + process.cwd())

    const context = github.context;

    if (context.eventName !== "pull_request") {
        str = "This action was called from an unexpected event. ";
        str += 'This action expects to be called from a "pull_request" event, ';
        str += 'but it is actually a "'+ context.eventName +'" event. ';
        throw Error(str)
    }

    // get token
    const token = core.getInput('token');
    // get octokit object(use to pull_request's comment)
    const octokit = github.getOctokit(token);

    let str = "";

    // JSON文字列をパース
    const pfs = JSON.parse(core.getInput('name-rule-filter'));
    // console.log('name-rule-filter: ' + pfs)

    // ブランチ名区切り文字(Default: '/@')
    const in_ref_delimiter = core.getInput('ref-delimiter');
    // const in_ref_delimiter = "/@";

    // head_refに親がないときの挙動 "pass" "error"
    const in_no_elem_headref = core.getInput('no-elem-headref');
    // const in_no_elem_headref = "error";

    // head_ref name
    const in_head_ref = process.env.GITHUB_HEAD_REF;
    // const in_head_ref = 'hotfix@1234';
    // base_ref name
    const in_base_ref = process.env.GITHUB_BASE_REF;
    // const in_base_ref = 'master';
    // プルリクNo
    const pr_number = context.payload.number;
    // Repo owner
    const owner = context.repo.owner;
    // Repo name
    const repo = context.repo.repo;
    // Actions run No
    const run_number = context.runNumber;
    // Actions run ID
    const run_id = context.runId;
    // serverUrl
    const server_url = context.serverUrl;

    // オプションチェック
    if (!['pass', 'error'].includes(in_no_elem_headref)) {
        // そんなオプションは存在しないエラー
        str = "アクションの 'no-elem-headref' オプションに指定された値 '";
        str += in_no_elem_headref;
        str +="' は無効です。 'pass' or 'error' のどちらかを指定してください。";
        throw Error(str)
    }

    console.log(
        '*** Check branch name on pull_request ***\n' + 
        'base_ref: \'' + in_base_ref + '\'' +
        ' <-- ' +
        'head_ref: \'' + in_head_ref + '\'\n' +
        'PR No : ' + pr_number + '\n' +
        'Repository : ' + owner + '/' + repo + ''
    )

    // in_head_refをin_ref_delimiter(文字列リスト)で分割
    const li = spplit(in_head_ref, in_ref_delimiter);
    console.log("splited head_ref: ")
    console.log(li)

    // (親)要素の抽出(パス区切りがない場合は自分自身)
    const headref_elem = li[Math.max(0, li.length -2)];
    console.log("head_ref element: " + headref_elem)

    // base_ref 名前ルールフィルタ検索
    // headref_elem が名前ルールフィルタにあるかどうかを検索
    // あった場合はbaseref_patternにフィルタ文字列を代入
    // なかった場合、baseref_patternはundefined
    let baseref_pattern;
    for (const p of pfs) {
        if (headref_elem === p.headref_element) {
            console.log("head_ref element が、名前ルールフィルタ内に見つかりました")
            baseref_pattern = p.baseref_pattern;
            break
        }
    }
    console.log("base_ref pattern: " + baseref_pattern)

    // base_ref 名前ルールフィルタ がない場合
    // 通常の解析マッチ
    if (baseref_pattern === undefined) {
        console.log("名前ルールフィルタにマッチしなかったので、通常の一致判定をします。")

        // リストが1要素の場合
        if (li.length === 1) {
            // オプションが 'error' の場合、エラー送出
            if (in_no_elem_headref === 'error') {
                // プルリクコメント投稿
                str = '## &#x274c;ブランチ名チェックエラー\n';
                str += 'base_ref : `\'' + in_base_ref + '\'`';
                str += ' &#x2190; ';
                str += 'head_ref : `\'' + in_head_ref + '\'`';
                str += '\n\n';
                str += 'プルリクエストブランチ名(head_ref) `\'' + in_head_ref + '\'` は、ブランチパス区切りがないため、';
                str += 'マージ先ブランチ(base_ref)の特定ができませんでした。\n';
                str += '\n';
                str += '[Action #' + run_number + ']';
                str += '(' + server_url + '/' + owner + '/' + repo + '/actions/runs/' + run_id + ')\n';
                str += '';
                octokit.rest.issues.createComment({
                    issue_number: pr_number,
                    owner: owner,
                    repo: repo,
                    body: str
                })
                // エラーをスロー
                str = "head_ref '" + in_head_ref + "' は、ブランチパス区切りがないため、 base_ref の特定ができませんでした。";
                throw Error(str)

            // オプションが 'pass' の場合、コンソール出力
            } else if (in_no_elem_headref === 'pass') {
                str = "head_ref '" + in_head_ref + "' は、ブランチパス区切りがないため、 base_ref の特定ができませんでした。";
                console.log(str)
            }

        // リストが多要素の場合(親要素がある場合)
        } else {
            // base_ref とマッチ判定
            if (in_base_ref === headref_elem) {
                str = "base_ref '" + in_base_ref + "' が、 headref_element と一致しました。";
                console.log(str)
                
            } else {
                // プルリクコメント投稿
                str = '## &#x274c;ブランチ名チェックエラー\n';
                str += 'base_ref : `\'' + in_base_ref + '\'`';
                str += ' &#x2190; ';
                str += 'head_ref : `\'' + in_head_ref + '\'`';
                str += '\n\n';
                str += 'プルリクエストブランチ名(head_ref)は `\'' + in_head_ref + '\'` であるため、';
                str += 'マージ先ブランチ(base_ref)は `\'' + headref_elem + '\'` でなければいけません。\n';
                str += '\n';
                str += '[Action #' + run_number + ']';
                str += '(' + server_url + '/' + owner + '/' + repo + '/actions/runs/' + run_id + ')\n';
                str += '';
                octokit.rest.issues.createComment({
                    issue_number: pr_number,
                    owner: owner,
                    repo: repo,
                    body: str
                })
                // エラーをスロー
                str = "headref_element '" + headref_elem + "' と、 base_ref '" + in_base_ref + "' が一致しませんでした。";
                throw Error(str)
                
            }
            
        }
        
    // base_ref 名前ルールフィルタ がマッチした場合
    } else {
        console.log("名前ルールフィルタマッチモード判定をします。")
        let re = new RegExp(baseref_pattern, 'g');

        if (re.test(in_base_ref)) {
            str = "base_ref '" + in_base_ref + "' が、 headref_elem '" + headref_elem + "' の名前ルールフィルタパターン一致しました。";
            console.log(str)
        
        } else {
            // プルリクコメント投稿
            str = '## &#x274c;ブランチ名チェックエラー\n';
            str += 'base_ref : `\'' + in_base_ref + '\'`';
            str += ' &#x2190; ';
            str += 'head_ref : `\'' + in_head_ref + '\'`';
            str += '\n\n';
            str += 'プルリクエストブランチ名(head_ref)は `\'' + in_head_ref + '\'` であるため、';
            str += 'マージ先ブランチ(base_ref)は `\'' + baseref_pattern + '\'` (正規表現)に一致しなければいけません。\n';
            str += '\n';
            str += '[Action #' + run_number + ']';
            str += '(' + server_url + '/' + owner + '/' + repo + '/actions/runs/' + run_id + ')\n';
            str += '';
            octokit.rest.issues.createComment({
                issue_number: pr_number,
                owner: owner,
                repo: repo,
                body: str
            })
            // エラーをスロー
            str = "base_ref '" + in_base_ref + "' が、 headref_elem '" + headref_elem + "' の名前ルールフィルタパターン一致しませんでした。";
            throw Error(str)
        
        }

    }


} catch (e) {
    console.error(e)
    core.setFailed(e.message);
}


function spplit(head_ref, delimiter) {
    /*
    input
    -----
    head_ref : string
    delimiter : string

    output
    ------
    li : list[string]

    */

    // 区切り文字を uni_delimiter に置き換えて、配列に分割
    let href = head_ref;
    let uni_delimiter = delimiter;
    while (1 < uni_delimiter.length) {
        let str1 = uni_delimiter.slice(0, 1);
        let str2 = uni_delimiter.slice(1, 2);
        href = href.replaceAll(str1, str2);
        uni_delimiter = uni_delimiter.slice(1);
    }

    const li = href.split(uni_delimiter);
    return li
}




